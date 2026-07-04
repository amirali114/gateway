package stats

import (
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"unixsee-campaign-gateway/agent/internal/decision"
	"unixsee-campaign-gateway/agent/internal/pathclass"
)

var actionKeys = []string{"allow", "queue", "block", "wait", "pass", "unknown"}

const (
	PathClassStaticAsset = pathclass.StaticAsset
	PathClassWPInternal  = pathclass.WPInternal
	PathClassAdmin       = pathclass.Admin
	PathClassCheckout    = pathclass.Checkout
	PathClassProduct     = pathclass.Product
	PathClassCart        = pathclass.Cart
	PathClassAccount     = pathclass.Account
	PathClassAPI         = pathclass.API
	PathClassOther       = pathclass.Other
)

type DiagnosticsConfig struct {
	Enabled                bool
	RecentMismatchLimit    int
	ExposeRecentMismatches bool
	IncludeUserAgent       bool
	IncludeIP              bool
}

type Counters struct {
	startedAt       time.Time
	received        atomic.Uint64
	stored          atomic.Uint64
	invalidJSON     atomic.Uint64
	signatureFailed atomic.Uint64

	mu            sync.RWMutex
	byAction      map[string]uint64
	comparison    comparisonCounters
	byPHPAction   map[string]uint64
	byAgentAction map[string]uint64

	diagnostics            DiagnosticsConfig
	comparisonMatrix       map[string]map[string]uint64
	mismatchByReason       map[string]uint64
	mismatchByAgentReason  map[string]uint64
	mismatchByPathClass    map[string]uint64
	recentMismatches       []RecentMismatch
	recentMismatchNextSlot int
}

type comparisonCounters struct {
	compared    uint64
	matched     uint64
	mismatched  uint64
	notCompared uint64
}

type ComparisonDetails struct {
	Time        time.Time
	SiteHost    string
	Path        string
	Query       string
	PHPReason   string
	AgentReason string
	IP          string
	UserAgent   string
}

type RecentMismatch struct {
	Time             time.Time `json:"time"`
	SiteHost         string    `json:"site_host"`
	Path             string    `json:"path"`
	PathClass        string    `json:"path_class"`
	PHPAction        string    `json:"php_action"`
	PHPReason        string    `json:"php_reason"`
	AgentAction      string    `json:"agent_action"`
	AgentReason      string    `json:"agent_reason"`
	ComparisonReason string    `json:"comparison_reason"`
	IP               *string   `json:"ip"`
	UserAgent        *string   `json:"user_agent"`
}

func DefaultDiagnosticsConfig() DiagnosticsConfig {
	return DiagnosticsConfig{
		Enabled:                true,
		RecentMismatchLimit:    100,
		ExposeRecentMismatches: true,
		IncludeUserAgent:       false,
		IncludeIP:              false,
	}
}

func New() *Counters {
	return NewWithDiagnostics(DefaultDiagnosticsConfig())
}

func NewWithDiagnostics(diag DiagnosticsConfig) *Counters {
	if diag.RecentMismatchLimit < 0 {
		diag.RecentMismatchLimit = 0
	}
	return &Counters{
		startedAt:              time.Now(),
		byAction:               newActionMap(),
		byPHPAction:            newActionMap(),
		byAgentAction:          newActionMap(),
		diagnostics:            diag,
		comparisonMatrix:       newComparisonMatrix(),
		mismatchByReason:       make(map[string]uint64),
		mismatchByAgentReason:  make(map[string]uint64),
		mismatchByPathClass:    make(map[string]uint64),
		recentMismatches:       make([]RecentMismatch, 0, diag.RecentMismatchLimit),
		recentMismatchNextSlot: 0,
	}
}

func newActionMap() map[string]uint64 {
	m := make(map[string]uint64, len(actionKeys))
	for _, action := range actionKeys {
		m[action] = 0
	}
	return m
}

func newComparisonMatrix() map[string]map[string]uint64 {
	matrix := make(map[string]map[string]uint64, len(actionKeys))
	for _, phpAction := range actionKeys {
		matrix[phpAction] = make(map[string]uint64, len(actionKeys))
		for _, agentAction := range actionKeys {
			matrix[phpAction][agentAction] = 0
		}
	}
	return matrix
}

func (c *Counters) IncReceived(action string) {
	c.received.Add(1)
	norm := decision.NormalizeAction(action)
	c.mu.Lock()
	c.byAction[norm]++
	c.mu.Unlock()
}

func (c *Counters) IncStored()          { c.stored.Add(1) }
func (c *Counters) IncInvalidJSON()     { c.invalidJSON.Add(1) }
func (c *Counters) IncSignatureFailed() { c.signatureFailed.Add(1) }

func (c *Counters) IncComparison(comp decision.Comparison) {
	c.ObserveComparison(comp, ComparisonDetails{})
}

func (c *Counters) ObserveComparison(comp decision.Comparison, details ComparisonDetails) {
	phpAction := decision.NormalizeAction(comp.PHPAction)
	agentAction := decision.NormalizeAction(comp.AgentAction)
	comp.PHPAction = phpAction
	comp.AgentAction = agentAction

	c.mu.Lock()
	defer c.mu.Unlock()

	c.byPHPAction[phpAction]++
	c.byAgentAction[agentAction]++
	if _, ok := c.comparisonMatrix[phpAction]; !ok {
		c.comparisonMatrix[phpAction] = newActionMap()
	}
	c.comparisonMatrix[phpAction][agentAction]++

	if !comp.Compared {
		c.comparison.notCompared++
		return
	}
	c.comparison.compared++
	if comp.Match {
		c.comparison.matched++
		return
	}
	c.comparison.mismatched++
	c.recordMismatchLocked(comp, details)
}

func (c *Counters) recordMismatchLocked(comp decision.Comparison, details ComparisonDetails) {
	if !c.diagnostics.Enabled {
		return
	}
	reason := safeKey(comp.Reason, "unknown")
	agentReason := safeKey(details.AgentReason, "unknown")
	pathClass := ClassifyRequestPath(details.Path, details.Query)

	c.mismatchByReason[reason]++
	c.mismatchByAgentReason[agentReason]++
	c.mismatchByPathClass[pathClass]++

	if !c.diagnostics.ExposeRecentMismatches || c.diagnostics.RecentMismatchLimit == 0 {
		return
	}
	itemTime := details.Time
	if itemTime.IsZero() {
		itemTime = time.Now().UTC()
	}
	var ip *string
	if c.diagnostics.IncludeIP && strings.TrimSpace(details.IP) != "" {
		v := details.IP
		ip = &v
	}
	var userAgent *string
	if c.diagnostics.IncludeUserAgent && strings.TrimSpace(details.UserAgent) != "" {
		v := details.UserAgent
		userAgent = &v
	}
	item := RecentMismatch{
		Time:             itemTime.UTC(),
		SiteHost:         details.SiteHost,
		Path:             sanitizePathForDiagnostics(details.Path),
		PathClass:        pathClass,
		PHPAction:        comp.PHPAction,
		PHPReason:        details.PHPReason,
		AgentAction:      comp.AgentAction,
		AgentReason:      details.AgentReason,
		ComparisonReason: comp.Reason,
		IP:               ip,
		UserAgent:        userAgent,
	}
	if len(c.recentMismatches) < c.diagnostics.RecentMismatchLimit {
		c.recentMismatches = append(c.recentMismatches, item)
		return
	}
	c.recentMismatches[c.recentMismatchNextSlot] = item
	c.recentMismatchNextSlot = (c.recentMismatchNextSlot + 1) % c.diagnostics.RecentMismatchLimit
}

func (c *Counters) Snapshot(mode string, storageEngine string, comparisonEnabled bool) map[string]any {
	return c.SnapshotWithPolicy(mode, storageEngine, comparisonEnabled, nil)
}

func (c *Counters) SnapshotWithPolicy(mode string, storageEngine string, comparisonEnabled bool, policySummary map[string]any) map[string]any {
	compared, matched, mismatched, notCompared, byAction, byPHPAction, byAgentAction := c.snapshotComparisonState()
	matchRate := matchRatePercent(matched, compared)

	payload := map[string]any{
		"ok":               true,
		"mode":             mode,
		"storage_engine":   storageEngine,
		"uptime_seconds":   uint64(time.Since(c.startedAt).Seconds()),
		"received":         c.received.Load(),
		"stored":           c.stored.Load(),
		"invalid_json":     c.invalidJSON.Load(),
		"signature_failed": c.signatureFailed.Load(),
		"by_action":        byAction,
		"comparison": map[string]any{
			"enabled":         comparisonEnabled,
			"compared":        compared,
			"matched":         matched,
			"mismatched":      mismatched,
			"not_compared":    notCompared,
			"match_rate":      matchRate,
			"by_php_action":   byPHPAction,
			"by_agent_action": byAgentAction,
		},
		"diagnostics": map[string]any{
			"enabled":               c.diagnostics.Enabled,
			"recent_mismatch_limit": c.diagnostics.RecentMismatchLimit,
		},
	}
	if policySummary != nil {
		payload["policy"] = policySummary
	}
	return payload
}

func (c *Counters) DiagnosticsSnapshot(mode string, comparisonEnabled bool) map[string]any {
	compared, matched, mismatched, notCompared, _, _, _ := c.snapshotComparisonState()

	c.mu.RLock()
	matrix := cloneNestedMap(c.comparisonMatrix)
	mismatchByReason := cloneMap(c.mismatchByReason)
	mismatchByAgentReason := cloneMap(c.mismatchByAgentReason)
	mismatchByPathClass := cloneMap(c.mismatchByPathClass)
	recent := c.recentMismatchSnapshotLocked()
	diagEnabled := c.diagnostics.Enabled
	exposeRecent := c.diagnostics.ExposeRecentMismatches
	c.mu.RUnlock()

	if !diagEnabled || !exposeRecent {
		recent = []RecentMismatch{}
	}

	return map[string]any{
		"ok":                  true,
		"mode":                mode,
		"diagnostics_enabled": diagEnabled,
		"comparison": map[string]any{
			"enabled":      comparisonEnabled,
			"compared":     compared,
			"matched":      matched,
			"mismatched":   mismatched,
			"not_compared": notCompared,
			"match_rate":   matchRatePercent(matched, compared),
		},
		"matrix":                   matrix,
		"mismatch_by_reason":       mismatchByReason,
		"mismatch_by_agent_reason": mismatchByAgentReason,
		"mismatch_by_path_class":   mismatchByPathClass,
		"recent_mismatches":        recent,
	}
}

func (c *Counters) snapshotComparisonState() (uint64, uint64, uint64, uint64, map[string]uint64, map[string]uint64, map[string]uint64) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.comparison.compared,
		c.comparison.matched,
		c.comparison.mismatched,
		c.comparison.notCompared,
		cloneMap(c.byAction),
		cloneMap(c.byPHPAction),
		cloneMap(c.byAgentAction)
}

func (c *Counters) recentMismatchSnapshotLocked() []RecentMismatch {
	if len(c.recentMismatches) == 0 {
		return []RecentMismatch{}
	}
	out := make([]RecentMismatch, 0, len(c.recentMismatches))
	if len(c.recentMismatches) < c.diagnostics.RecentMismatchLimit || c.recentMismatchNextSlot == 0 {
		out = append(out, c.recentMismatches...)
		return out
	}
	out = append(out, c.recentMismatches[c.recentMismatchNextSlot:]...)
	out = append(out, c.recentMismatches[:c.recentMismatchNextSlot]...)
	return out
}

func cloneMap(in map[string]uint64) map[string]uint64 {
	out := make(map[string]uint64, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cloneNestedMap(in map[string]map[string]uint64) map[string]map[string]uint64 {
	out := make(map[string]map[string]uint64, len(in))
	for k, inner := range in {
		out[k] = cloneMap(inner)
	}
	return out
}

func matchRatePercent(matched uint64, compared uint64) float64 {
	if compared == 0 {
		return 0
	}
	return float64(matched) * 100 / float64(compared)
}

func safeKey(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func sanitizePathForDiagnostics(requestPath string) string {
	return pathclass.SanitizePath(requestPath)
}

func ClassifyPath(requestPath string) string {
	return pathclass.ClassifyPath(requestPath)
}

func ClassifyRequestPath(requestPath string, rawQuery string) string {
	return pathclass.ClassifyRequestPath(requestPath, rawQuery)
}
