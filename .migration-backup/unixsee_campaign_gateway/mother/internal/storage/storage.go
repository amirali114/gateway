package storage

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"unixsee-campaign-gateway/mother/internal/policy"
)

const (
	EngineMemory             = "memory"
	EngineJSON               = "json"
	EnginePostgres           = "postgres"
	DefaultPolicyID          = "default"
	DefaultStaleAfterSeconds = 90
)

const (
	ConfigStatusDefault         = "default"
	ConfigStatusDraft           = "draft"
	ConfigStatusPublished       = "published"
	ConfigStatusDelivered       = "delivered"
	ConfigStatusAcknowledged    = "acknowledged"
	ConfigStatusSuperseded      = "superseded"
	ConfigStatusRollbackCreated = "rollback_created"
)

const (
	ConfigSourceDraftPublish = "draft_publish"
	ConfigSourceRollback     = "rollback"
)

const (
	AlertSeverityInfo     = "info"
	AlertSeverityWarn     = "warn"
	AlertSeverityCritical = "critical"
	AlertStatusActive     = "active"
	AlertStatusResolved   = "resolved"
	AlertStatusMuted      = "muted"
)

type Store interface {
	Open(ctx context.Context) error
	Close() error
	Health(ctx context.Context) error
	GetPolicy(ctx context.Context, agentID string) (policy.Profile, error)
	ListPolicies(ctx context.Context) ([]PolicySummary, error)
	GetPolicyByID(ctx context.Context, policyID string) (PolicyRecord, error)
	UpsertPolicy(ctx context.Context, record PolicyRecord) error
	GetAssignment(ctx context.Context, agentID string) (AssignmentRecord, error)
	AssignPolicy(ctx context.Context, agentID string, policyID string) error
	DeleteAssignment(ctx context.Context, agentID string) error
	RegisterPolicyPull(ctx context.Context, agentID string, remoteAddr string, profile policy.Profile) (AgentRecord, error)
	ListAgents(ctx context.Context) ([]AgentRecord, error)
	GetAgent(ctx context.Context, agentID string) (AgentRecord, error)
	GetActiveConfig(ctx context.Context, agentID string) (ConfigRecord, error)
	GetDraftConfig(ctx context.Context, agentID string) (ConfigRecord, error)
	SaveDraftConfig(ctx context.Context, agentID string, cfg ControlConfig) (ConfigRecord, error)
	SaveDraftConfigWithMeta(ctx context.Context, agentID string, cfg ControlConfig, baseVersion int, updatedBy string) (ConfigRecord, error)
	ValidateConfig(ctx context.Context, agentID string, cfg ControlConfig) (ConfigValidationResult, error)
	ConfigDiff(ctx context.Context, agentID string) (ConfigDiffResult, error)
	PublishDraftConfig(ctx context.Context, agentID string) (ConfigRecord, error)
	PublishDraftConfigWithNote(ctx context.Context, agentID string, note string, createdBy string) (ConfigRecord, error)
	ConfigHistory(ctx context.Context, agentID string) ([]ConfigRecord, error)
	ConfigVersions(ctx context.Context, agentID string) ([]ConfigRecord, error)
	GetConfigVersion(ctx context.Context, agentID string, version int) (ConfigRecord, error)
	RollbackConfig(ctx context.Context, agentID string, targetVersion int, note string, createdBy string) (ConfigRecord, error)
	MarkConfigDelivered(ctx context.Context, agentID string) (ConfigRecord, error)
	SaveTelemetry(ctx context.Context, agentID string, remoteAddr string, payload TelemetryPayload) (AgentRecord, error)
	GetTelemetry(ctx context.Context, agentID string) (TelemetryRecord, error)
	AgentDiagnostics(ctx context.Context, agentID string) (AgentDiagnostics, error)
	AgentEvents(ctx context.Context, agentID string) ([]EventRecord, error)
	DiagnosticsSummary(ctx context.Context) (DiagnosticsSummary, error)
	AddEvent(ctx context.Context, agentID string, typ string, severity string, message string, metadata map[string]any) error
	UpsertAlert(ctx context.Context, rec AlertRecord) (AlertRecord, bool, error)
	ListAlerts(ctx context.Context, filter AlertFilter) ([]AlertRecord, error)
	GetAlert(ctx context.Context, alertID string) (AlertRecord, error)
	ResolveAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error)
	MuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error)
	UnmuteAlert(ctx context.Context, alertID string, actor string) (AlertRecord, error)
	AlertSummary(ctx context.Context) (AlertSummary, error)
	StorageStatus(ctx context.Context) StorageStatus
}

type Options struct {
	Engine            string
	Path              string
	SyncWrites        bool
	BackupOnMigration bool
	Postgres          PostgresOptions
}

type StorageStatus struct {
	OK                bool           `json:"ok"`
	Engine            string         `json:"engine"`
	Path              string         `json:"path"`
	Writable          bool           `json:"writable"`
	LastLoadAt        time.Time      `json:"last_load_at,omitempty"`
	LastSaveAt        time.Time      `json:"last_save_at,omitempty"`
	LastError         string         `json:"last_error"`
	PersistedObjects  map[string]int `json:"persisted_objects"`
	DatabaseConnected bool           `json:"database_connected,omitempty"`
	SchemaVersion     int            `json:"schema_version,omitempty"`
	MigrationStatus   string         `json:"migration_status,omitempty"`
	LastQueryAt       time.Time      `json:"last_query_at,omitempty"`
	Tables            map[string]int `json:"tables,omitempty"`
	DsnRedacted       string         `json:"dsn_redacted,omitempty"`
}

type AlertRecord struct {
	ID              string         `json:"id"`
	Timestamp       time.Time      `json:"timestamp"`
	UpdatedAt       time.Time      `json:"updated_at"`
	AgentID         string         `json:"agent_id,omitempty"`
	Scope           string         `json:"scope"`
	Type            string         `json:"type"`
	Severity        string         `json:"severity"`
	Status          string         `json:"status"`
	Title           string         `json:"title"`
	Message         string         `json:"message"`
	Metadata        map[string]any `json:"metadata"`
	FirstSeenAt     time.Time      `json:"first_seen_at"`
	LastSeenAt      time.Time      `json:"last_seen_at"`
	ResolvedAt      time.Time      `json:"resolved_at,omitempty"`
	OccurrenceCount int            `json:"occurrence_count"`
	Fingerprint     string         `json:"fingerprint"`
}

type AlertFilter struct {
	Status  string
	AgentID string
	Scope   string
	Limit   int
}

type AlertSummary struct {
	OK          bool           `json:"ok"`
	ActiveTotal int            `json:"active_total"`
	Critical    int            `json:"critical"`
	Warn        int            `json:"warn"`
	Info        int            `json:"info"`
	Resolved24h int            `json:"resolved_24h"`
	Muted       int            `json:"muted"`
	ByScope     map[string]int `json:"by_scope"`
	Latest      []AlertRecord  `json:"latest"`
	GeneratedAt time.Time      `json:"generated_at"`
}

type PolicyRecord struct {
	ID        string         `json:"id"`
	Profile   policy.Profile `json:"profile"`
	IsDefault bool           `json:"is_default"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type PolicySummary struct {
	ID        string `json:"id"`
	ProfileID string `json:"profile_id"`
	Version   int    `json:"version"`
	Source    string `json:"source"`
	IsDefault bool   `json:"is_default"`
}

type AssignmentRecord struct {
	AgentID    string    `json:"agent_id"`
	PolicyID   string    `json:"policy_id"`
	Assigned   bool      `json:"assigned"`
	AssignedAt time.Time `json:"assigned_at,omitempty"`
}

type AgentRecord struct {
	AgentID                   string    `json:"agent_id"`
	FirstSeenAt               time.Time `json:"first_seen_at,omitempty"`
	LastSeenAt                time.Time `json:"last_seen_at,omitempty"`
	LastPolicyPullAt          time.Time `json:"last_policy_pull_at,omitempty"`
	LastPolicyProfileID       string    `json:"last_policy_profile_id"`
	LastPolicyVersion         int       `json:"last_policy_version"`
	LastSourceIP              string    `json:"last_source_ip"`
	PullCount                 int64     `json:"pull_count"`
	Status                    string    `json:"status"`
	StaleAfterSeconds         int       `json:"stale_after_seconds"`
	LastTelemetryAt           time.Time `json:"last_telemetry_at,omitempty"`
	TelemetryStatus           string    `json:"telemetry_status"`
	LastMatchRate             float64   `json:"last_match_rate"`
	LastReceived              uint64    `json:"last_received"`
	LastMismatched            uint64    `json:"last_mismatched"`
	ActiveConfigVersion       int       `json:"active_config_version"`
	ActiveConfigHash          string    `json:"active_config_hash"`
	LastConfigDeliveredAt     time.Time `json:"last_config_delivered_at,omitempty"`
	LastConfigAckAt           time.Time `json:"last_config_ack_at,omitempty"`
	AcknowledgedConfigVersion int       `json:"acknowledged_config_version"`
	AcknowledgedConfigHash    string    `json:"acknowledged_config_hash"`
	ConfigSyncStatus          string    `json:"config_sync_status"`
}

type ControlConfig struct {
	Gateway  GatewayConfig  `json:"gateway"`
	Campaign CampaignConfig `json:"campaign"`
	Queue    ModuleConfig   `json:"queue"`
	Bot      ModuleConfig   `json:"bot"`
	Storage  StorageConfig  `json:"storage"`
	Security SecurityConfig `json:"security"`
}

type GatewayConfig struct {
	Enabled       bool   `json:"enabled"`
	Mode          string `json:"mode"`
	DefaultAction string `json:"default_action"`
}
type CampaignConfig struct {
	Enabled bool `json:"enabled"`
}
type ModuleConfig struct {
	Enabled bool `json:"enabled"`
}
type StorageConfig struct {
	FailMode string `json:"fail_mode"`
}
type SecurityConfig struct {
	RequireSignature bool `json:"require_signature"`
}

type ConfigRecord struct {
	AgentID             string        `json:"agent_id"`
	Version             int           `json:"version"`
	ConfigHash          string        `json:"config_hash"`
	Config              ControlConfig `json:"config"`
	Status              string        `json:"status"`
	CreatedAt           time.Time     `json:"created_at,omitempty"`
	CreatedBy           string        `json:"created_by,omitempty"`
	PublishedBy         string        `json:"published_by,omitempty"`
	RollbackBy          string        `json:"rollback_by,omitempty"`
	PublishedAt         time.Time     `json:"published_at,omitempty"`
	Source              string        `json:"source"`
	RollbackFromVersion *int          `json:"rollback_from_version,omitempty"`
	Note                string        `json:"note,omitempty"`
	DeliveredAt         time.Time     `json:"delivered_at,omitempty"`
	AcknowledgedAt      time.Time     `json:"acknowledged_at,omitempty"`
	UpdatedAt           time.Time     `json:"updated_at,omitempty"`
	UpdatedBy           string        `json:"updated_by,omitempty"`
	BaseVersion         int           `json:"base_version,omitempty"`
	ValidationStatus    string        `json:"validation_status,omitempty"`
	Dirty               bool          `json:"dirty"`
}

type ConfigValidationResult struct {
	Valid  bool   `json:"valid"`
	Error  string `json:"error"`
	Hash   string `json:"config_hash"`
	Status string `json:"status"`
}

type ConfigDiffResult struct {
	AgentID       string   `json:"agent_id"`
	ActiveVersion int      `json:"active_version"`
	DraftVersion  int      `json:"draft_version"`
	ActiveHash    string   `json:"active_hash"`
	DraftHash     string   `json:"draft_hash"`
	Dirty         bool     `json:"dirty"`
	Added         []string `json:"added"`
	Removed       []string `json:"removed"`
	Changed       []string `json:"changed"`
}

type TelemetryPayload struct {
	AgentID       string                 `json:"agent_id"`
	Timestamp     string                 `json:"timestamp"`
	Mode          string                 `json:"mode"`
	UptimeSeconds uint64                 `json:"uptime_seconds"`
	Policy        map[string]any         `json:"policy"`
	Storage       map[string]any         `json:"storage"`
	Shadow        TelemetryShadowPayload `json:"shadow"`
	Runtime       TelemetryRuntime       `json:"runtime"`
	ControlPlane  map[string]any         `json:"control_plane"`
}

type TelemetryShadowPayload struct {
	Received        uint64         `json:"received"`
	Stored          uint64         `json:"stored"`
	InvalidJSON     uint64         `json:"invalid_json"`
	SignatureFailed uint64         `json:"signature_failed"`
	Comparison      map[string]any `json:"comparison"`
	ByAction        map[string]any `json:"by_action"`
}

type TelemetryRuntime struct {
	GatewayEnabled  bool   `json:"gateway_enabled"`
	CampaignEnabled bool   `json:"campaign_enabled"`
	QueueEnabled    bool   `json:"queue_enabled"`
	BotEnabled      bool   `json:"bot_enabled"`
	StorageFailMode string `json:"storage_fail_mode"`
}

type TelemetryRecord struct {
	AgentID    string           `json:"agent_id"`
	ReceivedAt time.Time        `json:"received_at"`
	RemoteAddr string           `json:"remote_addr"`
	Payload    TelemetryPayload `json:"payload"`
}

type EventRecord struct {
	ID        string         `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	AgentID   string         `json:"agent_id"`
	Type      string         `json:"type"`
	Severity  string         `json:"severity"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata"`
}

type AgentDiagnostics struct {
	AgentID   string           `json:"agent_id"`
	Telemetry *TelemetryRecord `json:"telemetry"`
	Events    []EventRecord    `json:"events"`
}

type DiagnosticsSummary struct {
	TotalAgents            int           `json:"total_agents"`
	OnlineAgents           int           `json:"online_agents"`
	StaleAgents            int           `json:"stale_agents"`
	UnknownAgents          int           `json:"unknown_agents"`
	TelemetryFresh         int           `json:"telemetry_fresh"`
	TelemetryStale         int           `json:"telemetry_stale"`
	TelemetryMissing       int           `json:"telemetry_missing"`
	AverageMatchRate       float64       `json:"average_match_rate"`
	TotalReceived          uint64        `json:"total_received"`
	TotalMismatched        uint64        `json:"total_mismatched"`
	StaleAgentIDs          []string      `json:"stale_agent_ids"`
	MismatchedAgentIDs     []string      `json:"mismatched_agent_ids"`
	RecentEvents           []EventRecord `json:"recent_events"`
	ConfigsPublishedTotal  int           `json:"configs_published_total"`
	ConfigsPendingDelivery int           `json:"configs_pending_delivery"`
	ConfigsDelivered       int           `json:"configs_delivered"`
	ConfigsAcknowledged    int           `json:"configs_acknowledged"`
	ConfigsStale           int           `json:"configs_stale"`
	RollbacksTotal         int           `json:"rollbacks_total"`
	LatestConfigEvents     []EventRecord `json:"latest_config_events"`
}

const maxEventsPerAgent = 100

var (
	ErrPolicyNotFound = fmt.Errorf("policy not found")
	ErrAgentNotFound  = fmt.Errorf("agent not found")
	ErrConfigNotFound = fmt.Errorf("config not found")
)

func DefaultControlConfig() ControlConfig {
	return ControlConfig{Gateway: GatewayConfig{Enabled: true, Mode: "shadow", DefaultAction: "allow"}, Campaign: CampaignConfig{Enabled: true}, Queue: ModuleConfig{Enabled: false}, Bot: ModuleConfig{Enabled: false}, Storage: StorageConfig{FailMode: "open"}, Security: SecurityConfig{RequireSignature: true}}
}

func ValidateControlConfig(c ControlConfig) error {
	if c.Gateway.Mode != "shadow" {
		return fmt.Errorf("gateway.mode must be shadow")
	}
	if c.Gateway.DefaultAction != "allow" && c.Gateway.DefaultAction != "pass" {
		return fmt.Errorf("gateway.default_action must be allow or pass")
	}
	if c.Storage.FailMode != "open" && c.Storage.FailMode != "closed" {
		return fmt.Errorf("storage.fail_mode must be open or closed")
	}
	return nil
}

func ConfigHash(c ControlConfig) string {
	b, _ := json.Marshal(c)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func HashPrefix(hash string) string {
	if len(hash) <= 12 {
		return hash
	}
	return hash[:12]
}

func NewStore(opts Options) (Store, error) {
	switch strings.ToLower(strings.TrimSpace(opts.Engine)) {
	case "", EngineMemory:
		return NewMemoryStore(), nil
	case EngineJSON:
		return NewJSONStore(opts), nil
	case EnginePostgres:
		return NewPostgresStore(opts), nil
	default:
		return nil, fmt.Errorf("unsupported mother storage engine %q", opts.Engine)
	}
}

type MemoryStore struct {
	mu            sync.RWMutex
	policies      map[string]PolicyRecord
	assignments   map[string]AssignmentRecord
	agents        map[string]AgentRecord
	activeConfigs map[string]ConfigRecord
	draftConfigs  map[string]ConfigRecord
	history       map[string][]ConfigRecord
	telemetry     map[string]TelemetryRecord
	events        map[string][]EventRecord
	alerts        map[string]AlertRecord
	alertByFP     map[string]string
	nextEventID   uint64
	nextAlertID   uint64
}

func NewMemoryStore() *MemoryStore {
	now := time.Now().UTC()
	defaultPolicy := policy.DefaultRemotePolicy()
	return &MemoryStore{policies: map[string]PolicyRecord{DefaultPolicyID: {ID: DefaultPolicyID, Profile: defaultPolicy, IsDefault: true, CreatedAt: now, UpdatedAt: now}}, assignments: map[string]AssignmentRecord{}, agents: map[string]AgentRecord{}, activeConfigs: map[string]ConfigRecord{}, draftConfigs: map[string]ConfigRecord{}, history: map[string][]ConfigRecord{}, telemetry: map[string]TelemetryRecord{}, events: map[string][]EventRecord{}, alerts: map[string]AlertRecord{}, alertByFP: map[string]string{}}
}
func (s *MemoryStore) Open(ctx context.Context) error   { return ctx.Err() }
func (s *MemoryStore) Close() error                     { return nil }
func (s *MemoryStore) Health(ctx context.Context) error { return ctx.Err() }
func (s *MemoryStore) StorageStatus(ctx context.Context) StorageStatus {
	st := StorageStatus{OK: ctx.Err() == nil, Engine: EngineMemory, Path: "", Writable: true, PersistedObjects: map[string]int{}}
	if ctx.Err() != nil {
		st.LastError = ctx.Err().Error()
	}
	s.mu.RLock()
	st.PersistedObjects = s.countsLocked()
	s.mu.RUnlock()
	return st
}

func (s *MemoryStore) GetPolicy(ctx context.Context, agentID string) (policy.Profile, error) {
	if err := ctx.Err(); err != nil {
		return policy.Profile{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	if a, ok := s.assignments[agentID]; ok && a.Assigned {
		if rec, exists := s.policies[a.PolicyID]; exists {
			return rec.Profile, nil
		}
	}
	for _, rec := range s.policies {
		if rec.IsDefault {
			return rec.Profile, nil
		}
	}
	return policy.Profile{}, fmt.Errorf("default policy unavailable")
}
func (s *MemoryStore) ListPolicies(ctx context.Context) ([]PolicySummary, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	out := make([]PolicySummary, 0, len(s.policies))
	for _, rec := range s.policies {
		out = append(out, PolicySummary{ID: rec.ID, ProfileID: rec.Profile.ProfileID, Version: rec.Profile.Version, Source: rec.Profile.Source, IsDefault: rec.IsDefault})
	}
	s.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}
func (s *MemoryStore) GetPolicyByID(ctx context.Context, policyID string) (PolicyRecord, error) {
	if err := ctx.Err(); err != nil {
		return PolicyRecord{}, err
	}
	policyID = strings.TrimSpace(policyID)
	s.mu.RLock()
	rec, ok := s.policies[policyID]
	s.mu.RUnlock()
	if !ok {
		return PolicyRecord{}, ErrPolicyNotFound
	}
	return rec, nil
}
func (s *MemoryStore) UpsertPolicy(ctx context.Context, record PolicyRecord) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	record.ID = strings.TrimSpace(record.ID)
	if record.ID == "" {
		return fmt.Errorf("empty policy ID")
	}
	if err := policy.Validate(record.Profile); err != nil {
		return err
	}
	now := time.Now().UTC()
	s.mu.Lock()
	if existing, ok := s.policies[record.ID]; ok && !record.IsDefault {
		record.IsDefault = existing.IsDefault
	}
	if record.CreatedAt.IsZero() {
		if existing, ok := s.policies[record.ID]; ok {
			record.CreatedAt = existing.CreatedAt
		} else {
			record.CreatedAt = now
		}
	}
	record.UpdatedAt = now
	s.policies[record.ID] = record
	s.mu.Unlock()
	return nil
}
func (s *MemoryStore) GetAssignment(ctx context.Context, agentID string) (AssignmentRecord, error) {
	if err := ctx.Err(); err != nil {
		return AssignmentRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	rec, ok := s.assignments[agentID]
	s.mu.RUnlock()
	if !ok {
		return AssignmentRecord{AgentID: agentID, Assigned: false}, nil
	}
	return rec, nil
}
func (s *MemoryStore) AssignPolicy(ctx context.Context, agentID string, policyID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	agentID = strings.TrimSpace(agentID)
	policyID = strings.TrimSpace(policyID)
	if agentID == "" {
		return fmt.Errorf("empty agent ID")
	}
	if policyID == "" {
		return fmt.Errorf("empty policy ID")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.policies[policyID]; !ok {
		return ErrPolicyNotFound
	}
	s.assignments[agentID] = AssignmentRecord{AgentID: agentID, PolicyID: policyID, Assigned: true, AssignedAt: time.Now().UTC()}
	return nil
}
func (s *MemoryStore) DeleteAssignment(ctx context.Context, agentID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.Lock()
	delete(s.assignments, agentID)
	s.mu.Unlock()
	return nil
}

func (s *MemoryStore) RegisterPolicyPull(ctx context.Context, agentID string, remoteAddr string, profile policy.Profile) (AgentRecord, error) {
	if err := ctx.Err(); err != nil {
		return AgentRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		return AgentRecord{}, fmt.Errorf("empty agent ID")
	}
	now := time.Now().UTC()
	s.mu.Lock()
	rec := s.agents[agentID]
	if rec.FirstSeenAt.IsZero() {
		rec.FirstSeenAt = now
	}
	rec.AgentID = agentID
	rec.LastSeenAt = now
	rec.LastPolicyPullAt = now
	rec.LastPolicyProfileID = profile.ProfileID
	rec.LastPolicyVersion = profile.Version
	rec.LastSourceIP = remoteAddr
	rec.PullCount++
	rec.StaleAfterSeconds = DefaultStaleAfterSeconds
	rec.Status = statusFor(rec.LastSeenAt, now)
	rec.TelemetryStatus = telemetryStatusFor(rec.LastTelemetryAt, now)
	rec.ConfigSyncStatus = configSyncStatusLocked(rec, s.activeConfigs[agentID], now)
	s.agents[agentID] = rec
	s.addEventLocked(agentID, "policy_pull", "info", "Policy pulled by agent", map[string]any{"profile_id": profile.ProfileID, "version": profile.Version, "remote_addr": remoteAddr})
	s.mu.Unlock()
	return rec, nil
}
func (s *MemoryStore) ListAgents(ctx context.Context) ([]AgentRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	s.mu.RLock()
	out := make([]AgentRecord, 0, len(s.agents))
	for _, a := range s.agents {
		a.Status = statusFor(a.LastSeenAt, now)
		a.TelemetryStatus = telemetryStatusFor(a.LastTelemetryAt, now)
		if a.StaleAfterSeconds == 0 {
			a.StaleAfterSeconds = DefaultStaleAfterSeconds
		}
		a.ConfigSyncStatus = configSyncStatusLocked(a, s.activeConfigs[a.AgentID], now)
		out = append(out, a)
	}
	s.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool { return out[i].AgentID < out[j].AgentID })
	return out, nil
}
func (s *MemoryStore) GetAgent(ctx context.Context, agentID string) (AgentRecord, error) {
	if err := ctx.Err(); err != nil {
		return AgentRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	now := time.Now().UTC()
	s.mu.RLock()
	rec, ok := s.agents[agentID]
	active := s.activeConfigs[agentID]
	s.mu.RUnlock()
	if !ok {
		return AgentRecord{}, ErrAgentNotFound
	}
	rec.Status = statusFor(rec.LastSeenAt, now)
	rec.TelemetryStatus = telemetryStatusFor(rec.LastTelemetryAt, now)
	if rec.StaleAfterSeconds == 0 {
		rec.StaleAfterSeconds = DefaultStaleAfterSeconds
	}
	rec.ConfigSyncStatus = configSyncStatusLocked(rec, active, now)
	return rec, nil
}
func statusFor(lastSeen, timeNow time.Time) string {
	if lastSeen.IsZero() {
		return "unknown"
	}
	if timeNow.Sub(lastSeen) <= time.Duration(DefaultStaleAfterSeconds)*time.Second {
		return "online"
	}
	return "stale"
}
func telemetryStatusFor(lastTelemetry, timeNow time.Time) string {
	if lastTelemetry.IsZero() {
		return "missing"
	}
	if timeNow.Sub(lastTelemetry) <= time.Duration(DefaultStaleAfterSeconds)*time.Second {
		return "fresh"
	}
	return "stale"
}

func (s *MemoryStore) GetActiveConfig(ctx context.Context, agentID string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	rec, ok := s.activeConfigs[agentID]
	s.mu.RUnlock()
	if !ok {
		cfg := DefaultControlConfig()
		return ConfigRecord{AgentID: agentID, Version: 0, ConfigHash: ConfigHash(cfg), Config: cfg, Status: ConfigStatusDefault, Source: "mother"}, nil
	}
	return rec, nil
}
func (s *MemoryStore) GetDraftConfig(ctx context.Context, agentID string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	rec, ok := s.draftConfigs[agentID]
	active := s.activeConfigs[agentID]
	s.mu.RUnlock()
	if !ok {
		return ConfigRecord{}, ErrConfigNotFound
	}
	rec.Dirty = rec.ConfigHash != active.ConfigHash
	return rec, nil
}
func (s *MemoryStore) SaveDraftConfig(ctx context.Context, agentID string, cfg ControlConfig) (ConfigRecord, error) {
	return s.SaveDraftConfigWithMeta(ctx, agentID, cfg, 0, "dashboard")
}
func (s *MemoryStore) SaveDraftConfigWithMeta(ctx context.Context, agentID string, cfg ControlConfig, baseVersion int, updatedBy string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	if err := ValidateControlConfig(cfg); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		return ConfigRecord{}, fmt.Errorf("empty agent ID")
	}
	if strings.TrimSpace(updatedBy) == "" {
		updatedBy = "dashboard"
	}
	now := time.Now().UTC()
	hash := ConfigHash(cfg)
	s.mu.Lock()
	active := s.activeConfigs[agentID]
	if baseVersion == 0 {
		baseVersion = active.Version
	}
	version := active.Version + 1
	if draft, ok := s.draftConfigs[agentID]; ok && draft.Version > version {
		version = draft.Version
	}
	rec := ConfigRecord{AgentID: agentID, Version: version, ConfigHash: hash, Config: cfg, Status: ConfigStatusDraft, CreatedAt: now, UpdatedAt: now, UpdatedBy: updatedBy, CreatedBy: updatedBy, Source: "mother", BaseVersion: baseVersion, ValidationStatus: "valid", Dirty: hash != active.ConfigHash}
	s.draftConfigs[agentID] = rec
	s.addEventLocked(agentID, "config_draft_saved", "info", "Config draft saved", map[string]any{"version": version, "hash": HashPrefix(hash), "base_version": baseVersion, "actor": updatedBy})
	s.mu.Unlock()
	return rec, nil
}
func (s *MemoryStore) ValidateConfig(ctx context.Context, agentID string, cfg ControlConfig) (ConfigValidationResult, error) {
	if err := ctx.Err(); err != nil {
		return ConfigValidationResult{}, err
	}
	hash := ConfigHash(cfg)
	if err := ValidateControlConfig(cfg); err != nil {
		return ConfigValidationResult{Valid: false, Error: err.Error(), Hash: hash, Status: "invalid"}, nil
	}
	return ConfigValidationResult{Valid: true, Hash: hash, Status: "valid"}, nil
}
func (s *MemoryStore) ConfigDiff(ctx context.Context, agentID string) (ConfigDiffResult, error) {
	if err := ctx.Err(); err != nil {
		return ConfigDiffResult{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	active := s.activeConfigs[agentID]
	draft, ok := s.draftConfigs[agentID]
	s.mu.RUnlock()
	if !ok {
		return ConfigDiffResult{AgentID: agentID, ActiveVersion: active.Version, ActiveHash: active.ConfigHash, Dirty: false}, nil
	}
	added, removed, changed := diffConfigs(active.Config, draft.Config)
	return ConfigDiffResult{AgentID: agentID, ActiveVersion: active.Version, DraftVersion: draft.Version, ActiveHash: active.ConfigHash, DraftHash: draft.ConfigHash, Dirty: active.ConfigHash != draft.ConfigHash, Added: added, Removed: removed, Changed: changed}, nil
}
func (s *MemoryStore) PublishDraftConfig(ctx context.Context, agentID string) (ConfigRecord, error) {
	return s.PublishDraftConfigWithNote(ctx, agentID, "", "dashboard")
}
func (s *MemoryStore) PublishDraftConfigWithNote(ctx context.Context, agentID string, note string, createdBy string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	if strings.TrimSpace(createdBy) == "" {
		createdBy = "dashboard"
	}
	now := time.Now().UTC()
	s.mu.Lock()
	draft, ok := s.draftConfigs[agentID]
	if !ok {
		s.mu.Unlock()
		return ConfigRecord{}, ErrConfigNotFound
	}
	if err := ValidateControlConfig(draft.Config); err != nil {
		s.addEventLocked(agentID, "config_validation_failed", "warn", "Config validation failed", map[string]any{"error": err.Error()})
		s.mu.Unlock()
		return ConfigRecord{}, err
	}
	version := nextVersionLocked(s.history[agentID])
	prev := s.activeConfigs[agentID]
	if prev.Version > 0 {
		s.markSupersededLocked(agentID, prev.Version)
	}
	draft.Version = version
	draft.Status = ConfigStatusPublished
	draft.PublishedAt = now
	draft.CreatedAt = now
	draft.CreatedBy = createdBy
	draft.PublishedBy = createdBy
	draft.Source = ConfigSourceDraftPublish
	draft.Note = strings.TrimSpace(note)
	draft.ConfigHash = ConfigHash(draft.Config)
	draft.DeliveredAt = time.Time{}
	draft.AcknowledgedAt = time.Time{}
	draft.Dirty = false
	draft.ValidationStatus = "valid"
	s.activeConfigs[agentID] = draft
	delete(s.draftConfigs, agentID)
	s.history[agentID] = append([]ConfigRecord{draft}, s.history[agentID]...)
	s.updateAgentConfigStatusLocked(agentID, draft, "pending_delivery", now)
	s.addEventLocked(agentID, "config_published", "info", "Config published", map[string]any{"version": draft.Version, "hash": HashPrefix(draft.ConfigHash), "note": draft.Note, "actor": createdBy})
	s.mu.Unlock()
	return draft, nil
}
func (s *MemoryStore) ConfigHistory(ctx context.Context, agentID string) ([]ConfigRecord, error) {
	return s.ConfigVersions(ctx, agentID)
}
func (s *MemoryStore) ConfigVersions(ctx context.Context, agentID string) ([]ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	hist := append([]ConfigRecord(nil), s.history[agentID]...)
	s.mu.RUnlock()
	return hist, nil
}
func (s *MemoryStore) GetConfigVersion(ctx context.Context, agentID string, version int) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, rec := range s.history[agentID] {
		if rec.Version == version {
			return rec, nil
		}
	}
	return ConfigRecord{}, ErrConfigNotFound
}
func (s *MemoryStore) RollbackConfig(ctx context.Context, agentID string, targetVersion int, note string, createdBy string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	if targetVersion <= 0 {
		return ConfigRecord{}, fmt.Errorf("invalid target_version")
	}
	if strings.TrimSpace(createdBy) == "" {
		createdBy = "dashboard"
	}
	now := time.Now().UTC()
	s.mu.Lock()
	target, ok := findVersionLocked(s.history[agentID], targetVersion)
	if !ok {
		s.mu.Unlock()
		return ConfigRecord{}, ErrConfigNotFound
	}
	if err := ValidateControlConfig(target.Config); err != nil {
		s.mu.Unlock()
		return ConfigRecord{}, err
	}
	prev := s.activeConfigs[agentID]
	if prev.Version > 0 {
		s.markSupersededLocked(agentID, prev.Version)
	}
	version := nextVersionLocked(s.history[agentID])
	rollbackFrom := targetVersion
	rec := ConfigRecord{AgentID: agentID, Version: version, ConfigHash: ConfigHash(target.Config), Config: target.Config, Status: ConfigStatusPublished, CreatedAt: now, CreatedBy: createdBy, PublishedBy: createdBy, RollbackBy: createdBy, PublishedAt: now, Source: ConfigSourceRollback, RollbackFromVersion: &rollbackFrom, Note: strings.TrimSpace(note), ValidationStatus: "valid"}
	s.activeConfigs[agentID] = rec
	delete(s.draftConfigs, agentID)
	s.history[agentID] = append([]ConfigRecord{rec}, s.history[agentID]...)
	s.updateAgentConfigStatusLocked(agentID, rec, "pending_delivery", now)
	s.addEventLocked(agentID, "config_rollback_published", "warn", "Rollback config published", map[string]any{"version": rec.Version, "rollback_from_version": targetVersion, "hash": HashPrefix(rec.ConfigHash), "note": rec.Note, "actor": createdBy})
	s.mu.Unlock()
	return rec, nil
}
func (s *MemoryStore) MarkConfigDelivered(ctx context.Context, agentID string) (ConfigRecord, error) {
	if err := ctx.Err(); err != nil {
		return ConfigRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	now := time.Now().UTC()
	s.mu.Lock()
	rec, ok := s.activeConfigs[agentID]
	if !ok {
		s.mu.Unlock()
		return ConfigRecord{}, ErrConfigNotFound
	}
	first := rec.DeliveredAt.IsZero()
	if first {
		rec.DeliveredAt = now
	}
	if rec.Status == ConfigStatusPublished {
		rec.Status = ConfigStatusDelivered
	}
	s.activeConfigs[agentID] = rec
	s.replaceHistoryVersionLocked(agentID, rec)
	s.updateAgentConfigStatusLocked(agentID, rec, "delivered", now)
	if first {
		s.addEventLocked(agentID, "config_delivered", "info", "Config delivered to agent", map[string]any{"version": rec.Version, "hash": HashPrefix(rec.ConfigHash)})
	}
	s.mu.Unlock()
	return rec, nil
}

func (s *MemoryStore) SaveTelemetry(ctx context.Context, agentID string, remoteAddr string, payload TelemetryPayload) (AgentRecord, error) {
	if err := ctx.Err(); err != nil {
		return AgentRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		return AgentRecord{}, fmt.Errorf("empty agent ID")
	}
	if strings.TrimSpace(payload.AgentID) != "" && strings.TrimSpace(payload.AgentID) != agentID {
		return AgentRecord{}, fmt.Errorf("telemetry agent_id mismatch")
	}
	payload.AgentID = agentID
	now := time.Now().UTC()
	rec := TelemetryRecord{AgentID: agentID, ReceivedAt: now, RemoteAddr: remoteAddr, Payload: payload}
	matchRate := numberFromMap(payload.Shadow.Comparison, "match_rate")
	mismatched := uint64(numberFromMap(payload.Shadow.Comparison, "mismatched"))
	s.mu.Lock()
	agent := s.agents[agentID]
	if agent.FirstSeenAt.IsZero() {
		agent.FirstSeenAt = now
	}
	agent.AgentID = agentID
	agent.LastSeenAt = now
	agent.LastTelemetryAt = now
	agent.LastSourceIP = remoteAddr
	agent.StaleAfterSeconds = DefaultStaleAfterSeconds
	agent.Status = statusFor(agent.LastSeenAt, now)
	agent.TelemetryStatus = telemetryStatusFor(agent.LastTelemetryAt, now)
	agent.LastMatchRate = matchRate
	agent.LastReceived = payload.Shadow.Received
	agent.LastMismatched = mismatched
	if active, ok := s.activeConfigs[agentID]; ok {
		agent.ConfigSyncStatus = configSyncStatusLocked(agent, active, now)
		version := int(numberFromMap(payload.ControlPlane, "config_version"))
		hash := stringFromMap(payload.ControlPlane, "config_hash")
		if version == active.Version && hash != "" && hash == active.ConfigHash {
			first := active.AcknowledgedAt.IsZero()
			active.AcknowledgedAt = now
			active.Status = ConfigStatusAcknowledged
			s.activeConfigs[agentID] = active
			s.replaceHistoryVersionLocked(agentID, active)
			agent.LastConfigAckAt = now
			agent.AcknowledgedConfigVersion = active.Version
			agent.AcknowledgedConfigHash = active.ConfigHash
			agent.ConfigSyncStatus = "acknowledged"
			if first {
				s.addEventLocked(agentID, "config_acknowledged", "info", "Config acknowledged by telemetry", map[string]any{"version": active.Version, "hash": HashPrefix(active.ConfigHash)})
			}
		}
	}
	s.agents[agentID] = agent
	s.telemetry[agentID] = rec
	s.addEventLocked(agentID, "telemetry_received", "info", "Telemetry received", map[string]any{"received": payload.Shadow.Received, "mismatched": mismatched, "match_rate": matchRate})
	s.mu.Unlock()
	return agent, nil
}
func numberFromMap(m map[string]any, key string) float64 {
	if m == nil {
		return 0
	}
	switch v := m[key].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case uint64:
		return float64(v)
	case json.Number:
		f, _ := v.Float64()
		return f
	case string:
		f, _ := strconv.ParseFloat(v, 64)
		return f
	default:
		return 0
	}
}
func stringFromMap(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	switch v := m[key].(type) {
	case string:
		return strings.TrimSpace(v)
	default:
		return fmt.Sprint(v)
	}
}
func (s *MemoryStore) GetTelemetry(ctx context.Context, agentID string) (TelemetryRecord, error) {
	if err := ctx.Err(); err != nil {
		return TelemetryRecord{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	rec, ok := s.telemetry[agentID]
	s.mu.RUnlock()
	if !ok {
		return TelemetryRecord{}, fmt.Errorf("telemetry not found")
	}
	return rec, nil
}
func (s *MemoryStore) AgentDiagnostics(ctx context.Context, agentID string) (AgentDiagnostics, error) {
	if err := ctx.Err(); err != nil {
		return AgentDiagnostics{}, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	var tel *TelemetryRecord
	if rec, ok := s.telemetry[agentID]; ok {
		copy := rec
		tel = &copy
	}
	events := append([]EventRecord(nil), s.events[agentID]...)
	s.mu.RUnlock()
	return AgentDiagnostics{AgentID: agentID, Telemetry: tel, Events: events}, nil
}
func (s *MemoryStore) AgentEvents(ctx context.Context, agentID string) ([]EventRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	agentID = strings.TrimSpace(agentID)
	s.mu.RLock()
	events := append([]EventRecord(nil), s.events[agentID]...)
	s.mu.RUnlock()
	return events, nil
}
func (s *MemoryStore) DiagnosticsSummary(ctx context.Context) (DiagnosticsSummary, error) {
	if err := ctx.Err(); err != nil {
		return DiagnosticsSummary{}, err
	}
	now := time.Now().UTC()
	out := DiagnosticsSummary{RecentEvents: []EventRecord{}, LatestConfigEvents: []EventRecord{}}
	var rateSum float64
	var rateCount int
	s.mu.RLock()
	for _, a := range s.agents {
		out.TotalAgents++
		a.Status = statusFor(a.LastSeenAt, now)
		a.TelemetryStatus = telemetryStatusFor(a.LastTelemetryAt, now)
		switch a.Status {
		case "online":
			out.OnlineAgents++
		case "stale":
			out.StaleAgents++
			out.StaleAgentIDs = append(out.StaleAgentIDs, a.AgentID)
		default:
			out.UnknownAgents++
		}
		switch a.TelemetryStatus {
		case "fresh":
			out.TelemetryFresh++
		case "stale":
			out.TelemetryStale++
		default:
			out.TelemetryMissing++
		}
		if !a.LastTelemetryAt.IsZero() {
			rateSum += a.LastMatchRate
			rateCount++
		}
		out.TotalReceived += a.LastReceived
		out.TotalMismatched += a.LastMismatched
		if a.LastMismatched > 0 {
			out.MismatchedAgentIDs = append(out.MismatchedAgentIDs, a.AgentID)
		}
		status := configSyncStatusLocked(a, s.activeConfigs[a.AgentID], now)
		switch status {
		case "pending_delivery":
			out.ConfigsPendingDelivery++
		case "delivered":
			out.ConfigsDelivered++
		case "acknowledged":
			out.ConfigsAcknowledged++
		case "stale":
			out.ConfigsStale++
		}
		out.RecentEvents = append(out.RecentEvents, s.events[a.AgentID]...)
	}
	for _, versions := range s.history {
		for _, v := range versions {
			if v.Status != "" {
				out.ConfigsPublishedTotal++
			}
			if v.Source == ConfigSourceRollback {
				out.RollbacksTotal++
			}
		}
	}
	s.mu.RUnlock()
	if rateCount > 0 {
		out.AverageMatchRate = rateSum / float64(rateCount)
	}
	sort.Slice(out.RecentEvents, func(i, j int) bool { return out.RecentEvents[i].Timestamp.After(out.RecentEvents[j].Timestamp) })
	if len(out.RecentEvents) > 100 {
		out.RecentEvents = out.RecentEvents[:100]
	}
	for _, e := range out.RecentEvents {
		if strings.HasPrefix(e.Type, "config_") {
			out.LatestConfigEvents = append(out.LatestConfigEvents, e)
		}
		if len(out.LatestConfigEvents) >= 50 {
			break
		}
	}
	return out, nil
}
func (s *MemoryStore) AddEvent(ctx context.Context, agentID string, typ string, severity string, message string, metadata map[string]any) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.Lock()
	s.addEventLocked(agentID, typ, severity, message, metadata)
	s.mu.Unlock()
	return nil
}

func (s *MemoryStore) countsLocked() map[string]int {
	historyItems := 0
	for _, items := range s.history {
		historyItems += len(items)
	}
	eventItems := 0
	for _, items := range s.events {
		eventItems += len(items)
	}
	return map[string]int{"policies": len(s.policies), "assignments": len(s.assignments), "agents": len(s.agents), "active_configs": len(s.activeConfigs), "draft_configs": len(s.draftConfigs), "history_items": historyItems, "telemetry": len(s.telemetry), "events": eventItems, "alerts": len(s.alerts)}
}
func (s *MemoryStore) addEventLocked(agentID string, typ string, severity string, message string, metadata map[string]any) {
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		agentID = "unknown"
	}
	if severity == "" {
		severity = "info"
	}
	s.nextEventID++
	rec := EventRecord{ID: fmt.Sprintf("evt-%d", s.nextEventID), Timestamp: time.Now().UTC(), AgentID: agentID, Type: typ, Severity: severity, Message: message, Metadata: metadata}
	s.events[agentID] = append([]EventRecord{rec}, s.events[agentID]...)
	if len(s.events[agentID]) > maxEventsPerAgent {
		s.events[agentID] = s.events[agentID][:maxEventsPerAgent]
	}
}
func (s *MemoryStore) markSupersededLocked(agentID string, version int) {
	hist := s.history[agentID]
	for i := range hist {
		if hist[i].Version == version && hist[i].Status != ConfigStatusAcknowledged {
			hist[i].Status = ConfigStatusSuperseded
			s.addEventLocked(agentID, "config_superseded", "info", "Config superseded", map[string]any{"version": version, "hash": HashPrefix(hist[i].ConfigHash)})
			break
		}
	}
	s.history[agentID] = hist
}
func (s *MemoryStore) replaceHistoryVersionLocked(agentID string, rec ConfigRecord) {
	hist := s.history[agentID]
	for i := range hist {
		if hist[i].Version == rec.Version {
			hist[i] = rec
			s.history[agentID] = hist
			return
		}
	}
	s.history[agentID] = append([]ConfigRecord{rec}, hist...)
}
func (s *MemoryStore) updateAgentConfigStatusLocked(agentID string, rec ConfigRecord, status string, now time.Time) {
	a := s.agents[agentID]
	if a.AgentID == "" {
		a.AgentID = agentID
		a.FirstSeenAt = now
	}
	a.ActiveConfigVersion = rec.Version
	a.ActiveConfigHash = rec.ConfigHash
	if status == "delivered" {
		a.LastConfigDeliveredAt = now
	}
	a.ConfigSyncStatus = status
	s.agents[agentID] = a
}
func configSyncStatusLocked(a AgentRecord, active ConfigRecord, now time.Time) string {
	if active.Version == 0 {
		return "missing"
	}
	if a.AcknowledgedConfigVersion == active.Version && a.AcknowledgedConfigHash == active.ConfigHash {
		return "acknowledged"
	}
	if !a.LastConfigDeliveredAt.IsZero() && a.ActiveConfigVersion == active.Version {
		if !a.LastSeenAt.IsZero() && now.Sub(a.LastSeenAt) > time.Duration(DefaultStaleAfterSeconds)*time.Second {
			return "stale"
		}
		return "delivered"
	}
	return "pending_delivery"
}
func nextVersionLocked(hist []ConfigRecord) int {
	max := 0
	for _, r := range hist {
		if r.Version > max {
			max = r.Version
		}
	}
	return max + 1
}
func findVersionLocked(hist []ConfigRecord, version int) (ConfigRecord, bool) {
	for _, r := range hist {
		if r.Version == version {
			return r, true
		}
	}
	return ConfigRecord{}, false
}
func diffConfigs(active ControlConfig, draft ControlConfig) ([]string, []string, []string) {
	a := flattenConfig(active)
	d := flattenConfig(draft)
	added := []string{}
	removed := []string{}
	changed := []string{}
	for k, dv := range d {
		if av, ok := a[k]; !ok {
			added = append(added, k)
		} else if av != dv {
			changed = append(changed, k)
		}
	}
	for k := range a {
		if _, ok := d[k]; !ok {
			removed = append(removed, k)
		}
	}
	sort.Strings(added)
	sort.Strings(removed)
	sort.Strings(changed)
	return added, removed, changed
}
func flattenConfig(c ControlConfig) map[string]string {
	return map[string]string{"gateway.enabled": fmt.Sprint(c.Gateway.Enabled), "gateway.mode": c.Gateway.Mode, "gateway.default_action": c.Gateway.DefaultAction, "campaign.enabled": fmt.Sprint(c.Campaign.Enabled), "queue.enabled": fmt.Sprint(c.Queue.Enabled), "bot.enabled": fmt.Sprint(c.Bot.Enabled), "storage.fail_mode": c.Storage.FailMode, "security.require_signature": fmt.Sprint(c.Security.RequireSignature)}
}
