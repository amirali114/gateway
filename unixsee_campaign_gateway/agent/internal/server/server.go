package server

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"unixsee-campaign-gateway/agent/internal/config"
	"unixsee-campaign-gateway/agent/internal/decision"
	"unixsee-campaign-gateway/agent/internal/logger"
	"unixsee-campaign-gateway/agent/internal/policy"
	"unixsee-campaign-gateway/agent/internal/security"
	"unixsee-campaign-gateway/agent/internal/shadow"
	"unixsee-campaign-gateway/agent/internal/stats"
	"unixsee-campaign-gateway/agent/internal/storage"
)

type Server struct {
	cfg             config.Config
	log             *logger.Logger
	store           storage.Store
	stats           *stats.Counters
	policyMu        sync.RWMutex
	decisionEngine  decision.Engine
	policyProfile   policy.Profile
	syncMu          sync.RWMutex
	policySync      PolicySyncStatus
	refreshCancel   context.CancelFunc
	telemetryCancel context.CancelFunc
	httpSrv         *http.Server
}

type PolicySyncStatus struct {
	Enabled            bool
	MotherBaseURL      string
	AgentID            string
	LastAttemptAt      time.Time
	LastSuccessAt      time.Time
	LastError          string
	NextRefreshSeconds int
	UseLastKnownGood   bool
	CacheEnabled       bool
}

func New(cfg config.Config, log *logger.Logger, store storage.Store, counters *stats.Counters) *Server {
	engine := decision.NewPolicyEngine(decision.Config{
		Enabled:        cfg.Decision.Enabled,
		Mode:           cfg.Decision.Mode,
		DefaultAction:  cfg.Decision.DefaultAction,
		CompareUnknown: cfg.Decision.CompareUnknown,
	}, cfg.Policy)
	s := &Server{cfg: cfg, log: log, store: store, stats: counters, decisionEngine: engine, policyProfile: cfg.Policy}
	s.initPolicySyncStatus()
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.healthz)
	mux.HandleFunc("/readyz", s.readyz)
	mux.HandleFunc("/v1/shadow/decision", s.shadowDecision)
	mux.HandleFunc("/v1/stats", s.statsEndpoint)
	mux.HandleFunc("/v1/comparison/diagnostics", s.comparisonDiagnosticsEndpoint)
	mux.HandleFunc("/v1/policy/effective", s.policyEffectiveEndpoint)
	mux.HandleFunc("/v1/policy/sync-status", s.policySyncStatusEndpoint)
	mux.HandleFunc("/", s.notFound)

	timeout := time.Duration(cfg.Limits.RequestTimeoutMS) * time.Millisecond
	s.httpSrv = &http.Server{
		Addr:              cfg.Agent.ListenAddr,
		Handler:           requestTimeout(mux, timeout),
		ReadHeaderTimeout: timeout,
		ReadTimeout:       timeout * 2,
		WriteTimeout:      timeout * 2,
		IdleTimeout:       30 * time.Second,
		BaseContext: func(net.Listener) context.Context {
			return context.Background()
		},
	}
	return s
}

func (s *Server) initPolicySyncStatus() {
	enabled := s.cfg.PolicyConfiguredSource == policy.SourceMother && s.cfg.Mother.Enabled
	st := PolicySyncStatus{
		Enabled:            enabled,
		MotherBaseURL:      policy.SanitizeBaseURL(s.cfg.Mother.BaseURL),
		AgentID:            s.cfg.Mother.AgentID,
		NextRefreshSeconds: s.cfg.Mother.PolicyRefreshSeconds,
		UseLastKnownGood:   s.cfg.Mother.UseLastKnownGood,
		CacheEnabled:       s.cfg.Mother.PolicyCachePath != "",
		LastError:          policy.SanitizeError(s.cfg.PolicyError, s.cfg.Mother.SharedSecret),
	}
	if enabled {
		now := time.Now().UTC()
		st.LastAttemptAt = now
		if s.cfg.PolicyStatus == policy.StatusFresh {
			st.LastSuccessAt = now
		}
	}
	s.syncMu.Lock()
	s.policySync = st
	s.syncMu.Unlock()
}

func (s *Server) markPolicySyncAttempt(t time.Time) {
	s.syncMu.Lock()
	s.policySync.Enabled = s.cfg.PolicyConfiguredSource == policy.SourceMother && s.cfg.Mother.Enabled
	s.policySync.MotherBaseURL = policy.SanitizeBaseURL(s.cfg.Mother.BaseURL)
	s.policySync.AgentID = s.cfg.Mother.AgentID
	s.policySync.NextRefreshSeconds = s.cfg.Mother.PolicyRefreshSeconds
	s.policySync.UseLastKnownGood = s.cfg.Mother.UseLastKnownGood
	s.policySync.CacheEnabled = s.cfg.Mother.PolicyCachePath != ""
	s.policySync.LastAttemptAt = t.UTC()
	s.syncMu.Unlock()
}

func (s *Server) updatePolicySyncResult(resolved policy.Effective, err error) {
	s.syncMu.Lock()
	defer s.syncMu.Unlock()
	if err != nil {
		s.policySync.LastError = policy.SanitizeError(err.Error(), s.cfg.Mother.SharedSecret)
		return
	}
	s.policySync.LastError = policy.SanitizeError(resolved.Error, s.cfg.Mother.SharedSecret)
	if resolved.Status == policy.StatusFresh {
		s.policySync.LastSuccessAt = time.Now().UTC()
	}
}

func (s *Server) currentPolicySyncStatus() PolicySyncStatus {
	s.syncMu.RLock()
	defer s.syncMu.RUnlock()
	return s.policySync
}

func (s *Server) Start() error {
	s.startPolicyRefresh()
	s.startTelemetryPush()
	s.log.Info("server_starting", map[string]any{"listen_addr": s.cfg.Agent.ListenAddr, "mode": s.cfg.Agent.Mode})
	err := s.httpSrv.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *Server) Shutdown(ctx context.Context) error {
	if s.refreshCancel != nil {
		s.refreshCancel()
	}
	if s.telemetryCancel != nil {
		s.telemetryCancel()
	}
	s.log.Info("server_shutdown", nil)
	return s.httpSrv.Shutdown(ctx)
}

func (s *Server) startTelemetryPush() {
	if s == nil || !s.cfg.Telemetry.Enabled || !s.cfg.Mother.Enabled || strings.TrimSpace(s.cfg.Mother.BaseURL) == "" || strings.TrimSpace(s.cfg.Mother.AgentID) == "" {
		return
	}
	interval := time.Duration(s.cfg.Telemetry.PushIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 30 * time.Second
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.telemetryCancel = cancel
	go func() {
		s.pushTelemetryOnce(ctx)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.pushTelemetryOnce(ctx)
			}
		}
	}()
}

func (s *Server) pushTelemetryOnce(ctx context.Context) {
	payload := s.telemetryPayload()
	agentID := strings.TrimSpace(s.cfg.Mother.AgentID)
	path := "/v1/agents/" + url.PathEscape(agentID) + "/telemetry"
	base := strings.TrimRight(strings.TrimSpace(s.cfg.Mother.BaseURL), "/")
	if base == "" || agentID == "" {
		return
	}
	body, err := json.Marshal(payload)
	if err != nil {
		s.log.Warn("telemetry_marshal_failed", map[string]any{"error": err.Error()})
		return
	}
	timeout := time.Duration(s.cfg.Telemetry.PushTimeoutMS) * time.Millisecond
	if timeout <= 0 {
		timeout = 700 * time.Millisecond
	}
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, base+path, bytes.NewReader(body))
	if err != nil {
		s.log.Warn("telemetry_request_create_failed", map[string]any{"error": policy.SanitizeError(err.Error(), s.cfg.Mother.SharedSecret)})
		return
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Unixsee-Agent-ID", agentID)
	if secret := strings.TrimSpace(s.cfg.Mother.SharedSecret); secret != "" {
		ts := fmt.Sprintf("%d", time.Now().Unix())
		req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
		req.Header.Set("X-Unixsee-Agent-Signature", signCanonical(secret, http.MethodPost+"\n"+path+"\n"+ts))
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		s.log.Warn("telemetry_push_failed", map[string]any{"error": policy.SanitizeError(err.Error(), s.cfg.Mother.SharedSecret)})
		return
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		s.log.Warn("telemetry_push_non_2xx", map[string]any{"status": resp.StatusCode})
		return
	}
	s.log.Info("telemetry_pushed", map[string]any{"agent_id": agentID})
}

func signCanonical(secret string, canonical string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(canonical))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func (s *Server) telemetryPayload() map[string]any {
	profile, status := s.currentPolicy()
	policySummary := policySummaryMap(profile, status)
	snap := s.stats.SnapshotWithPolicy(s.cfg.Agent.Mode, s.cfg.Storage.Engine, s.cfg.Decision.Enabled, policySummary)
	storageOK := true
	if s.store == nil || s.store.Health(context.Background()) != nil {
		storageOK = false
	}
	return map[string]any{
		"agent_id":       s.cfg.Mother.AgentID,
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"mode":           s.cfg.Agent.Mode,
		"uptime_seconds": snap["uptime_seconds"],
		"policy":         policySummary,
		"storage": map[string]any{
			"engine": s.cfg.Storage.Engine,
			"ok":     storageOK,
		},
		"shadow": map[string]any{
			"received":         snap["received"],
			"stored":           snap["stored"],
			"invalid_json":     snap["invalid_json"],
			"signature_failed": snap["signature_failed"],
			"comparison":       snap["comparison"],
			"by_action":        snap["by_action"],
		},
		"runtime": map[string]any{
			"gateway_enabled":   profile.Gateway.Enabled,
			"campaign_enabled":  profile.Campaign.Enabled,
			"queue_enabled":     profile.Queue.Enabled,
			"bot_enabled":       profile.Bot.Enabled,
			"storage_fail_mode": profile.Storage.FailMode,
		},
		"control_plane": profile.ControlPlane,
	}
}

func (s *Server) startPolicyRefresh() {
	if s == nil || s.cfg.PolicyConfiguredSource != policy.SourceMother || !s.cfg.Mother.Enabled || s.cfg.Mother.PolicyRefreshSeconds <= 0 {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.refreshCancel = cancel
	interval := time.Duration(s.cfg.Mother.PolicyRefreshSeconds) * time.Second
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.refreshPolicyOnce(ctx)
			}
		}
	}()
}

func (s *Server) refreshPolicyOnce(ctx context.Context) {
	configured := policy.DefaultLocalProfile()
	configured.Source = policy.SourceMother
	attemptAt := time.Now().UTC()
	s.markPolicySyncAttempt(attemptAt)
	resolved, err := policy.Resolve(ctx, configured, policy.MotherOptions{
		Enabled:              s.cfg.Mother.Enabled,
		BaseURL:              s.cfg.Mother.BaseURL,
		AgentID:              s.cfg.Mother.AgentID,
		SharedSecret:         s.cfg.Mother.SharedSecret,
		Timeout:              time.Duration(s.cfg.Mother.PolicyPullTimeoutMS) * time.Millisecond,
		UseLastKnownGood:     s.cfg.Mother.UseLastKnownGood,
		PolicyCachePath:      s.cfg.Mother.PolicyCachePath,
		PolicyRefreshSeconds: s.cfg.Mother.PolicyRefreshSeconds,
	})
	if err != nil {
		s.updatePolicySyncResult(policy.Effective{}, err)
		s.log.Warn("policy_refresh_failed", map[string]any{"error": policy.SanitizeError(err.Error(), s.cfg.Mother.SharedSecret)})
		return
	}
	s.updatePolicySyncResult(resolved, nil)
	s.policyMu.Lock()
	s.policyProfile = resolved.Profile
	s.cfg.Policy = resolved.Profile
	s.cfg.PolicyStatus = resolved.Status
	s.cfg.PolicyError = resolved.Error
	s.decisionEngine = decision.NewPolicyEngine(decision.Config{
		Enabled:        s.cfg.Decision.Enabled,
		Mode:           s.cfg.Decision.Mode,
		DefaultAction:  s.cfg.Decision.DefaultAction,
		CompareUnknown: s.cfg.Decision.CompareUnknown,
	}, resolved.Profile)
	s.policyMu.Unlock()
	fields := resolved.Profile.SafeLogFields()
	fields["policy_status"] = resolved.Status
	if resolved.Error != "" {
		fields["policy_error"] = policy.SanitizeError(resolved.Error, s.cfg.Mother.SharedSecret)
	}
	s.log.Info("policy_refreshed", fields)
}

func requestTimeout(next http.Handler, timeout time.Duration) http.Handler {
	return http.TimeoutHandler(next, timeout, jsonText(map[string]any{"ok": false, "error": "request_timeout"})+"\n")
}

func (s *Server) currentPolicy() (policy.Profile, string) {
	s.policyMu.RLock()
	defer s.policyMu.RUnlock()
	status := s.cfg.PolicyStatus
	if status == "" {
		status = policy.StatusLocal
	}
	return s.policyProfile, status
}

func (s *Server) currentEngine() decision.Engine {
	s.policyMu.RLock()
	defer s.policyMu.RUnlock()
	return s.decisionEngine
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "unixsee-agent",
		"mode":    s.cfg.Agent.Mode,
	})
}

func (s *Server) readyz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	profile, status := s.currentPolicy()
	if s.store == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "storage": "error", "storage_engine": s.cfg.Storage.Engine, "policy": "ok", "policy_source": profile.Source, "policy_status": status, "error": "storage is nil"})
		return
	}
	if err := s.store.Health(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "storage": "error", "storage_engine": s.cfg.Storage.Engine, "policy": "ok", "policy_source": profile.Source, "policy_status": status, "error": err.Error()})
		return
	}
	if err := policy.Validate(profile); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "storage": "ok", "storage_engine": s.cfg.Storage.Engine, "policy": "error", "policy_source": profile.Source, "policy_status": status, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "storage": "ok", "storage_engine": s.cfg.Storage.Engine, "policy": "ok", "policy_source": profile.Source, "policy_status": status})
}

func (s *Server) statsEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	profile, status := s.currentPolicy()
	writeJSON(w, http.StatusOK, s.stats.SnapshotWithPolicy(s.cfg.Agent.Mode, s.cfg.Storage.Engine, s.cfg.Decision.Enabled, policySummaryMap(profile, status)))
}

func (s *Server) policyEffectiveEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	profile, status := s.currentPolicy()
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"mode":    s.cfg.Agent.Mode,
		"policy":  policySummaryMap(profile, status),
		"summary": policyRuntimeSummaryMap(profile),
	})
}

func (s *Server) policySyncStatusEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	profile, status := s.currentPolicy()
	syncStatus := s.currentPolicySyncStatus()
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":     true,
		"mode":   s.cfg.Agent.Mode,
		"policy": policySummaryMap(profile, status),
		"sync": map[string]any{
			"enabled":              syncStatus.Enabled,
			"mother_base_url":      syncStatus.MotherBaseURL,
			"agent_id":             syncStatus.AgentID,
			"last_attempt_at":      formatTime(syncStatus.LastAttemptAt),
			"last_success_at":      formatTime(syncStatus.LastSuccessAt),
			"last_error":           syncStatus.LastError,
			"next_refresh_seconds": syncStatus.NextRefreshSeconds,
			"use_last_known_good":  syncStatus.UseLastKnownGood,
			"cache_enabled":        syncStatus.CacheEnabled,
		},
	})
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

func policySummaryMap(profile policy.Profile, status string) map[string]any {
	if status == "" {
		status = policy.StatusLocal
	}
	return map[string]any{
		"source":     profile.Source,
		"profile_id": profile.ProfileID,
		"version":    profile.Version,
		"status":     status,
	}
}

func policyRuntimeSummaryMap(profile policy.Profile) map[string]any {
	return map[string]any{
		"gateway_enabled":   profile.Gateway.Enabled,
		"campaign_enabled":  profile.Campaign.Enabled,
		"storage_fail_mode": profile.Storage.FailMode,
		"queue_enabled":     profile.Queue.Enabled,
		"bot_enabled":       profile.Bot.Enabled,
	}
}

func (s *Server) comparisonDiagnosticsEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	writeJSON(w, http.StatusOK, s.stats.DiagnosticsSnapshot(s.cfg.Agent.Mode, s.cfg.Decision.Enabled))
}

func (s *Server) shadowDecision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w, http.MethodPost)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.Limits.MaxBodyBytes)
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		if errors.As(err, new(*http.MaxBytesError)) {
			writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{"ok": false, "error": "body_too_large"})
			return
		}
		s.log.Warn("read_body_failed", map[string]any{"error": err.Error(), "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "read_body_failed"})
		return
	}
	if len(raw) == 0 {
		s.stats.IncInvalidJSON()
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "empty_body"})
		return
	}

	sigStatus := security.ValidateShadowSignature(raw, r.Header.Get("X-Unixsee-Agent-Signature"), s.cfg.Security.ShadowSecret, s.cfg.Security.RequireSignature)
	if sigStatus.Checked && !sigStatus.Valid {
		s.stats.IncSignatureFailed()
		s.log.Warn("signature_failed", map[string]any{"error": sigStatus.Error, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		if s.cfg.Security.RequireSignature {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "invalid_signature"})
			return
		}
	}

	var payload shadow.Payload
	if err := json.Unmarshal(raw, &payload); err != nil {
		s.stats.IncInvalidJSON()
		s.log.Warn("invalid_json", map[string]any{"error": err.Error(), "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
		return
	}

	action := payload.Action()
	s.stats.IncReceived(action)
	if !payload.IsSupportedSchema() {
		s.log.Warn("unsupported_schema", map[string]any{"schema_version": payload.SchemaVersion, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
	}

	engine := s.currentEngine()
	agentDecision := engine.Decide(r.Context(), decision.Input{
		SchemaVersion:    payload.SchemaVersion,
		SiteHost:         payload.Site.Host,
		Scheme:           payload.Site.Scheme,
		IP:               payload.Request.IP,
		Method:           payload.Request.Method,
		Path:             payload.Request.Path,
		Query:            payload.Request.Query,
		UserAgent:        payload.Request.UserAgent,
		IsAjax:           payload.Request.IsAjax,
		StorageAvailable: payload.Runtime.StorageAvailable,
		StorageFailMode:  payload.Runtime.StorageFailMode,
		GatewayEnabled:   payload.Runtime.GatewayEnabled,
		CampaignEnabled:  payload.Runtime.CampaignEnabled,
	})
	comparison := decision.Compare(action, agentDecision.Action, s.cfg.Decision.CompareUnknown)
	pathClass := stats.ClassifyRequestPath(payload.Request.Path, payload.Request.Query)
	s.stats.ObserveComparison(comparison, stats.ComparisonDetails{
		Time:        time.Now().UTC(),
		SiteHost:    payload.Site.Host,
		Path:        payload.Request.Path,
		Query:       payload.Request.Query,
		PHPReason:   payload.PHPDecision.Reason,
		AgentReason: agentDecision.Reason,
		IP:          payload.Request.IP,
		UserAgent:   payload.Request.UserAgent,
	})

	var sigPtr *bool
	if sigStatus.Checked {
		v := sigStatus.Valid
		sigPtr = &v
	}

	record := storage.ShadowEventRecord{
		ID:             storage.NewShadowEventID(),
		ReceivedAt:     time.Now().UTC(),
		RemoteAddr:     sanitizeRemoteAddr(r.RemoteAddr),
		SignatureValid: sigPtr,
		SchemaVersion:  payload.SchemaVersion,
		PHPAction:      action,
		PHPReason:      payload.PHPDecision.Reason,
		SiteHost:       payload.Site.Host,
		RequestPath:    payload.Request.Path,
		AgentDecision:  agentDecision,
		Comparison:     comparison,
		Payload:        json.RawMessage(raw),
		StorageVersion: storage.StorageVersionJSONL,
	}

	stored := false
	if err := s.store.StoreShadowEvent(r.Context(), record); err != nil {
		s.log.Error("storage_error", map[string]any{"error": err.Error(), "remote_addr": sanitizeRemoteAddr(r.RemoteAddr), "action": action, "agent_action": agentDecision.Action, "storage_engine": s.cfg.Storage.Engine})
	} else {
		stored = true
		s.stats.IncStored()
	}

	logFields := map[string]any{
		"stored":            stored,
		"site_host":         payload.Site.Host,
		"path_class":        pathClass,
		"php_action":        action,
		"agent_action":      agentDecision.Action,
		"compared":          comparison.Compared,
		"match":             comparison.Match,
		"comparison_reason": comparison.Reason,
		"schema_version":    payload.SchemaVersion,
		"storage_engine":    s.cfg.Storage.Engine,
	}
	if comparison.Compared && !comparison.Match {
		s.log.Warn("shadow_comparison_mismatch", map[string]any{
			"stored":            stored,
			"site_host":         payload.Site.Host,
			"path_class":        pathClass,
			"php_action":        action,
			"agent_action":      agentDecision.Action,
			"php_reason":        payload.PHPDecision.Reason,
			"agent_reason":      agentDecision.Reason,
			"comparison_reason": comparison.Reason,
		})
	}
	s.log.Info("shadow_payload_received", logFields)

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":             true,
		"mode":           s.cfg.Agent.Mode,
		"stored":         stored,
		"agent_decision": agentDecision,
		"comparison":     comparison,
	})
}

func (s *Server) notFound(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
}

func writeMethodNotAllowed(w http.ResponseWriter, allowed string) {
	w.Header().Set("Allow", allowed)
	writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method_not_allowed"})
}

func writeJSON(w http.ResponseWriter, code int, payload map[string]any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func jsonText(payload map[string]any) string {
	b, err := json.Marshal(payload)
	if err != nil {
		return fmt.Sprintf(`{"ok":false,"error":"%s"}`, err.Error())
	}
	return string(b)
}

func sanitizeRemoteAddr(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return remoteAddr
}
