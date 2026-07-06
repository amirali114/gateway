package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/logger"
	"unixsee-campaign-gateway/mother/internal/policy"
	"unixsee-campaign-gateway/mother/internal/security"
	"unixsee-campaign-gateway/mother/internal/storage"
)

type Server struct {
	cfg                    config.Config
	log                    *logger.Logger
	store                  storage.Store
	httpSrv                *http.Server
	managementTokenWarning sync.Once
	alertStopCh            chan struct{}
	alertStopOnce          sync.Once
}

func New(cfg config.Config, log *logger.Logger, store storage.Store) *Server {
	s := &Server{cfg: cfg, log: log, store: store, alertStopCh: make(chan struct{})}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.healthz)
	mux.HandleFunc("/readyz", s.readyz)
	mux.HandleFunc("/v1/agents", s.agents)
	mux.HandleFunc("/v1/agents/", s.agentRoutes)
	mux.HandleFunc("/v1/diagnostics/summary", s.diagnosticsSummary)
	mux.HandleFunc("/v1/storage/status", s.storageStatus)
	mux.HandleFunc("/v1/alerts", s.alerts)
	mux.HandleFunc("/v1/alerts/", s.alertRoutes)
	mux.HandleFunc("/v1/release-gates", s.releaseGates)
	mux.HandleFunc("/v1/release-gates/summary", s.releaseGatesSummary)
	mux.HandleFunc("/v1/release/evidence", s.releaseEvidence)
	mux.HandleFunc("/v1/release/evidence/", s.releaseEvidenceByID)
	mux.HandleFunc("/v1/health/report", s.healthReport)
	mux.HandleFunc("/v1/debug/policies/default", s.defaultPolicy)
	mux.HandleFunc("/v1/policies", s.policies)
	mux.HandleFunc("/v1/policies/", s.policyByID)
	mux.HandleFunc("/", s.notFound)

	s.httpSrv = &http.Server{
		Addr:              cfg.Mother.ListenAddr,
		Handler:           http.MaxBytesHandler(mux, 1024*1024),
		ReadHeaderTimeout: 500 * time.Millisecond,
		ReadTimeout:       time.Second,
		WriteTimeout:      time.Second,
		IdleTimeout:       30 * time.Second,
		BaseContext: func(net.Listener) context.Context {
			return context.Background()
		},
	}
	return s
}

func (s *Server) Start() error {
	s.log.Info("mother_starting", map[string]any{"listen_addr": s.cfg.Mother.ListenAddr, "mode": s.cfg.Mother.Mode, "management_enabled": s.cfg.Management.Enabled, "management_write_enabled": s.cfg.Management.WriteEnabled})
	if s.cfg.Alerts.Enabled {
		go s.alertEvaluationLoop()
	}
	err := s.httpSrv.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.alertStopOnce.Do(func() { close(s.alertStopCh) })
	s.log.Info("mother_shutdown", nil)
	return s.httpSrv.Shutdown(ctx)
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "unixsee-mother", "mode": s.cfg.Mother.Mode})
}

func (s *Server) readyz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	if s.store == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "storage": "error", "error": "storage is nil"})
		return
	}
	if err := s.store.Health(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "storage": "error", "error": err.Error()})
		return
	}
	st := s.store.StorageStatus(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "storage": "ok", "storage_engine": st.Engine})
}

func (s *Server) storageStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	if s.store == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "engine": "", "path": "", "writable": false, "last_error": "storage is nil", "persisted_objects": map[string]int{}})
		return
	}
	st := s.store.StorageStatus(r.Context())
	status := http.StatusOK
	if !st.OK {
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, st)
}

func (s *Server) healthReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	storageStatus := storage.StorageStatus{OK: false, Engine: "", LastError: "storage is nil"}
	readyOK := false
	if s.store != nil {
		storageStatus = s.store.StorageStatus(r.Context())
		readyOK = s.store.Health(r.Context()) == nil
	}
	agents := []storage.AgentRecord{}
	summary := storage.DiagnosticsSummary{}
	alertSummary := storage.AlertSummary{OK: true, ByScope: map[string]int{}, Latest: []storage.AlertRecord{}}
	if s.store != nil {
		agents, _ = s.store.ListAgents(r.Context())
		summary, _ = s.store.DiagnosticsSummary(r.Context())
		_ = s.evaluateAlerts(r.Context(), "health_report")
		alertSummary, _ = s.store.AlertSummary(r.Context())
	}
	critical := []storage.EventRecord{}
	if summary.RecentEvents != nil {
		for _, ev := range summary.RecentEvents {
			if ev.Severity == "error" || ev.Severity == "warn" {
				critical = append(critical, ev)
			}
			if len(critical) >= 20 {
				break
			}
		}
	}
	releaseGates := s.evaluateReleaseGates(r.Context())
	releaseSummary := summarizeReleaseGates(releaseGates)

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":                        true,
		"healthz":                   map[string]any{"ok": true, "service": "unixsee-mother", "mode": s.cfg.Mother.Mode},
		"readyz":                    map[string]any{"ok": readyOK, "storage_engine": storageStatus.Engine},
		"storage":                   storageStatus,
		"agent_registry":            map[string]any{"total": len(agents), "agents": agents},
		"telemetry_summary":         map[string]any{"fresh": summary.TelemetryFresh, "stale": summary.TelemetryStale, "missing": summary.TelemetryMissing, "average_match_rate": summary.AverageMatchRate, "total_received": summary.TotalReceived, "total_mismatched": summary.TotalMismatched},
		"config_rollout_summary":    map[string]any{"configs_published_total": summary.ConfigsPublishedTotal, "pending_delivery": summary.ConfigsPendingDelivery, "delivered": summary.ConfigsDelivered, "acknowledged": summary.ConfigsAcknowledged, "stale": summary.ConfigsStale, "rollbacks_total": summary.RollbacksTotal},
		"alert_summary":             alertSummary,
		"release_gate_summary":      releaseSummary,
		"release_gates":             releaseGates,
		"blockers":                  releaseSummary.Blockers,
		"warnings":                  releaseSummary.Warnings,
		"backup_restore_status":     "unknown",
		"shadow_only_safety_status": releaseGateStatusByID(releaseGates, "shadow-only-config"),
		"public_exposure_status":    releaseGateStatusByID(releaseGates, "php-wrapper-model"),
		"recent_critical_events":    critical,
		"security_configuration":    map[string]any{"dashboard_auth_status": "dashboard_side", "management_token_configured": strings.TrimSpace(s.cfg.Management.APIToken) != "", "management_writes_enabled": s.cfg.Management.WriteEnabled, "agent_signature_required": s.cfg.Security.RequireSignature, "agent_shared_secret_configured": strings.TrimSpace(s.cfg.Security.AgentSharedSecret) != ""},
	})
}

func (s *Server) agents(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/v1/agents" {
		s.notFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	agents, err := s.store.ListAgents(r.Context())
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "agents_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agents": agents})
}

func (s *Server) agentRoutes(w http.ResponseWriter, r *http.Request) {
	prefix := "/v1/agents/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		s.notFound(w, r)
		return
	}
	rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
	if strings.HasSuffix(rest, "/policy") {
		agentID := strings.TrimSuffix(rest, "/policy")
		s.agentPolicy(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/policy-assignment") {
		agentID := strings.TrimSuffix(rest, "/policy-assignment")
		s.policyAssignment(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/telemetry") {
		agentID := strings.TrimSuffix(rest, "/telemetry")
		s.telemetry(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/diagnostics") {
		agentID := strings.TrimSuffix(rest, "/diagnostics")
		s.agentDiagnostics(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/events") {
		agentID := strings.TrimSuffix(rest, "/events")
		s.agentEvents(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/control-plane") {
		agentID := strings.TrimSuffix(rest, "/control-plane")
		s.controlPlane(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/draft") {
		agentID := strings.TrimSuffix(rest, "/config/draft")
		s.configDraft(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/validate") {
		agentID := strings.TrimSuffix(rest, "/config/validate")
		s.configValidate(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/diff") {
		agentID := strings.TrimSuffix(rest, "/config/diff")
		s.configDiff(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/publish") {
		agentID := strings.TrimSuffix(rest, "/config/publish")
		s.configPublish(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/rollback") {
		agentID := strings.TrimSuffix(rest, "/config/rollback")
		s.configRollback(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/active") {
		agentID := strings.TrimSuffix(rest, "/config/active")
		s.configActiveOnly(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config/versions") {
		agentID := strings.TrimSuffix(rest, "/config/versions")
		s.configVersions(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.Contains(rest, "/config/versions/") {
		parts := strings.Split(rest, "/config/versions/")
		if len(parts) == 2 {
			s.configVersion(w, r, strings.Trim(parts[0], "/"), strings.Trim(parts[1], "/"))
			return
		}
	}
	if strings.HasSuffix(rest, "/config/history") {
		agentID := strings.TrimSuffix(rest, "/config/history")
		s.configHistory(w, r, strings.Trim(agentID, "/"))
		return
	}
	if strings.HasSuffix(rest, "/config") {
		agentID := strings.TrimSuffix(rest, "/config")
		s.configActive(w, r, strings.Trim(agentID, "/"))
		return
	}
	if !strings.Contains(rest, "/") {
		s.agentDetail(w, r, rest)
		return
	}
	s.notFound(w, r)
}

func (s *Server) agentPolicy(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "missing_agent_id"})
		return
	}
	if ok := s.validateAgentIdentity(w, r, agentID); !ok {
		return
	}
	if sig := security.ValidateRequest(r, s.cfg.Security.AgentSharedSecret, s.cfg.Security.RequireSignature, s.cfg.Security.SignatureMaxSkewSeconds); sig.Checked && !sig.Valid {
		s.log.Warn("mother_signature_failed", map[string]any{"error": sig.Error, "agent_id": agentID, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "invalid_signature"})
		return
	}
	profile, err := s.store.GetPolicy(r.Context(), agentID)
	if err != nil {
		s.log.Error("mother_policy_fetch_failed", map[string]any{"error": err.Error(), "agent_id": agentID})
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "policy_unavailable"})
		return
	}
	_, _ = s.store.RegisterPolicyPull(r.Context(), agentID, sanitizeRemoteAddr(r.RemoteAddr), profile)
	controlPlane := s.controlPlaneMetadata(r.Context(), agentID)
	s.log.Info("mother_policy_served", map[string]any{"agent_id": agentID, "profile_id": profile.ProfileID, "version": profile.Version})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policy": policyProfilePayload(profile, controlPlane)})
}

func (s *Server) validateAgentIdentity(w http.ResponseWriter, r *http.Request, pathAgentID string) bool {
	pathAgentID = sanitizeAgentID(pathAgentID)
	headerAgentID := sanitizeAgentID(r.Header.Get("X-Unixsee-Agent-ID"))
	if s.cfg.Security.RequireSignature && headerAgentID == "" {
		s.log.Warn("mother_agent_identity_failed", map[string]any{"agent_id": pathAgentID, "error": "missing_agent_id_header", "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "missing_agent_id_header"})
		return false
	}
	if headerAgentID != "" && headerAgentID != pathAgentID {
		status := http.StatusBadRequest
		if s.cfg.Security.RequireSignature {
			status = http.StatusUnauthorized
		}
		s.log.Warn("mother_agent_identity_failed", map[string]any{"agent_id": pathAgentID, "header_agent_id": headerAgentID, "error": "agent_id_mismatch", "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, status, map[string]any{"ok": false, "error": "agent_id_mismatch"})
		return false
	}
	return true
}

func sanitizeAgentID(v string) string {
	v = strings.TrimSpace(v)
	if len(v) > 128 {
		v = v[:128]
	}
	return v
}

func (s *Server) agentDetail(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	agent, err := s.store.GetAgent(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "agent_not_found"})
		return
	}
	assignment, _ := s.store.GetAssignment(r.Context(), agentID)
	active, _ := s.store.GetActiveConfig(r.Context(), agentID)
	draft, draftErr := s.store.GetDraftConfig(r.Context(), agentID)
	versions, _ := s.store.ConfigVersions(r.Context(), agentID)
	payload := map[string]any{"ok": true, "agent": agent, "policy_assignment": assignment, "active_config": active, "versions": versions}
	if draftErr == nil {
		payload["draft_config"] = draft
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) controlPlane(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	agent, _ := s.store.GetAgent(r.Context(), agentID)
	assignment, _ := s.store.GetAssignment(r.Context(), agentID)
	active, _ := s.store.GetActiveConfig(r.Context(), agentID)
	draft, draftErr := s.store.GetDraftConfig(r.Context(), agentID)
	history, _ := s.store.ConfigHistory(r.Context(), agentID)
	diff, _ := s.store.ConfigDiff(r.Context(), agentID)
	payload := map[string]any{"ok": true, "mode": "shadow", "agent": agent, "policy_assignment": assignment, "active_config": active, "history": history, "diff": diff}
	if draftErr == nil {
		payload["draft_config"] = draft
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) configActive(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	active, err := s.store.GetActiveConfig(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "config_unavailable"})
		return
	}
	draft, draftErr := s.store.GetDraftConfig(r.Context(), agentID)
	diff, _ := s.store.ConfigDiff(r.Context(), agentID)
	payload := map[string]any{"ok": true, "active_config": active, "diff": diff}
	if draftErr == nil {
		payload["draft_config"] = draft
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) configActiveOnly(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	active, err := s.store.GetActiveConfig(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "config_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "active_config": active})
}

func actorFromRequest(r *http.Request) string {
	username := strings.TrimSpace(r.Header.Get("X-Unixsee-Actor-Username"))
	role := strings.TrimSpace(r.Header.Get("X-Unixsee-Actor-Role"))
	if username == "" {
		return "dashboard"
	}
	if len(username) > 96 {
		username = username[:96]
	}
	if len(role) > 32 {
		role = role[:32]
	}
	if role != "" {
		return username + ":" + role
	}
	return username
}

func (s *Server) configDraft(w http.ResponseWriter, r *http.Request, agentID string) {
	switch r.Method {
	case http.MethodGet:
		draft, err := s.store.GetDraftConfig(r.Context(), agentID)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "draft_config": nil, "message": "draft_missing"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "draft_config": draft})
	case http.MethodPost:
		if !s.writeAuthorized(w, r) {
			return
		}
		req, ok := decodeDraftConfigRequest(w, r)
		if !ok {
			return
		}
		rec, err := s.store.SaveDraftConfigWithMeta(r.Context(), agentID, req.Config, req.BaseVersion, actorFromRequest(r))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "draft_config": rec})
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost)
	}
}

func (s *Server) configValidate(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w, http.MethodPost)
		return
	}
	req, ok := decodeDraftConfigRequest(w, r)
	if !ok {
		return
	}
	result, err := s.store.ValidateConfig(r.Context(), agentID, req.Config)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "validation_unavailable"})
		return
	}
	status := http.StatusOK
	if !result.Valid {
		_ = s.store.AddEvent(r.Context(), agentID, "config_validation_failed", "warn", "Config validation failed", map[string]any{"error": result.Error})
	}
	writeJSON(w, status, map[string]any{"ok": true, "validation": result})
}

func (s *Server) configDiff(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	diff, err := s.store.ConfigDiff(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "diff_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "diff": diff})
}

func (s *Server) configPublish(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w, http.MethodPost)
		return
	}
	if !s.writeAuthorized(w, r) {
		return
	}
	note := decodeOptionalNote(r)
	rec, err := s.store.PublishDraftConfigWithNote(r.Context(), agentID, note, actorFromRequest(r))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
		return
	}
	_ = s.evaluateAlerts(r.Context(), "config_publish")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "active_config": rec, "version": rec.Version, "config_hash": rec.ConfigHash, "published_at": rec.PublishedAt, "status": rec.Status})
}

func (s *Server) configRollback(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w, http.MethodPost)
		return
	}
	if !s.writeAuthorized(w, r) {
		return
	}
	var req struct {
		TargetVersion int    `json:"target_version"`
		Note          string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
		return
	}
	rec, err := s.store.RollbackConfig(r.Context(), agentID, req.TargetVersion, req.Note, actorFromRequest(r))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, storage.ErrConfigNotFound) {
			status = http.StatusNotFound
		}
		writeJSON(w, status, map[string]any{"ok": false, "error": safeError(err)})
		return
	}
	_ = s.evaluateAlerts(r.Context(), "config_rollback")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "active_config": rec, "version": rec.Version, "config_hash": rec.ConfigHash, "published_at": rec.PublishedAt, "status": rec.Status})
}

func (s *Server) configHistory(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	history, err := s.store.ConfigHistory(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "history_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "history": history})
}

func (s *Server) configVersions(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	versions, err := s.store.ConfigVersions(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "versions_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "versions": versions})
}

func (s *Server) configVersion(w http.ResponseWriter, r *http.Request, agentID string, rawVersion string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	version, err := strconv.Atoi(strings.TrimSpace(rawVersion))
	if err != nil || version <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_version"})
		return
	}
	rec, err := s.store.GetConfigVersion(r.Context(), agentID, version)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "version_not_found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "version": rec})
}

type draftConfigRequest struct {
	Config      storage.ControlConfig `json:"config"`
	BaseVersion int                   `json:"base_version"`
}

func decodeDraftConfigRequest(w http.ResponseWriter, r *http.Request) (draftConfigRequest, bool) {
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_body"})
		return draftConfigRequest{}, false
	}
	var wrapped draftConfigRequest
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&wrapped); err == nil && (wrapped.Config.Gateway.Mode != "" || wrapped.Config.Gateway.DefaultAction != "") {
		if err := storage.ValidateControlConfig(wrapped.Config); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
			return wrapped, false
		}
		return wrapped, true
	}
	var cfg storage.ControlConfig
	dec = json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&cfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
		return draftConfigRequest{}, false
	}
	if err := storage.ValidateControlConfig(cfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
		return draftConfigRequest{}, false
	}
	return draftConfigRequest{Config: cfg}, true
}

func decodeOptionalNote(r *http.Request) string {
	if r.Body == nil {
		return ""
	}
	var req struct {
		Note string `json:"note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	return strings.TrimSpace(req.Note)
}

func (s *Server) controlPlaneMetadata(ctx context.Context, agentID string) map[string]any {
	active, err := s.store.MarkConfigDelivered(ctx, agentID)
	if err != nil || active.Version == 0 {
		active, _ = s.store.GetActiveConfig(ctx, agentID)
	}
	if active.Version == 0 {
		return map[string]any{"agent_id": agentID, "config_version": 0, "source": "mother"}
	}
	return map[string]any{"agent_id": agentID, "config_version": active.Version, "config_hash": active.ConfigHash, "published_at": active.PublishedAt, "source": "mother"}
}

func policyProfilePayload(p policy.Profile, controlPlane map[string]any) map[string]any {
	b, _ := json.Marshal(p)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	out["control_plane"] = controlPlane
	return out
}

func (s *Server) telemetry(w http.ResponseWriter, r *http.Request, agentID string) {
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "missing_agent_id"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rec, err := s.store.GetTelemetry(r.Context(), agentID)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "telemetry": nil, "message": "telemetry_missing"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "telemetry": rec})
	case http.MethodPost:
		if ok := s.validateAgentIdentity(w, r, agentID); !ok {
			return
		}
		if sig := security.ValidateRequest(r, s.cfg.Security.AgentSharedSecret, s.cfg.Security.RequireSignature, s.cfg.Security.SignatureMaxSkewSeconds); sig.Checked && !sig.Valid {
			s.log.Warn("mother_telemetry_signature_failed", map[string]any{"error": sig.Error, "agent_id": agentID, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
			_ = s.store.AddEvent(r.Context(), agentID, "invalid_signature", "error", "Invalid telemetry signature", map[string]any{"reason": sig.Error, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
			writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "invalid_signature"})
			return
		}
		var payload storage.TelemetryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			s.log.Warn("mother_telemetry_invalid_json", map[string]any{"agent_id": agentID, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
			_ = s.store.AddEvent(r.Context(), agentID, "validation_failure", "warn", "Invalid telemetry JSON", map[string]any{"remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
			return
		}
		if strings.TrimSpace(payload.AgentID) != "" && strings.TrimSpace(payload.AgentID) != agentID {
			_ = s.store.AddEvent(r.Context(), agentID, "validation_failure", "warn", "Telemetry agent_id mismatch", map[string]any{"payload_agent_id": strings.TrimSpace(payload.AgentID)})
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "agent_id_mismatch"})
			return
		}
		agent, err := s.store.SaveTelemetry(r.Context(), agentID, sanitizeRemoteAddr(r.RemoteAddr), payload)
		if err != nil {
			_ = s.store.AddEvent(r.Context(), agentID, "validation_failure", "warn", "Telemetry validation failed", map[string]any{"error": safeError(err)})
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
			return
		}
		_ = s.evaluateAlerts(r.Context(), "telemetry")
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent": agent, "telemetry_status": agent.TelemetryStatus})
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost)
	}
}

func (s *Server) agentDiagnostics(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	diag, err := s.store.AgentDiagnostics(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "diagnostics_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "diagnostics": diag})
}

func (s *Server) agentEvents(w http.ResponseWriter, r *http.Request, agentID string) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	events, err := s.store.AgentEvents(r.Context(), agentID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "events_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "events": events})
}

func (s *Server) diagnosticsSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	summary, err := s.store.DiagnosticsSummary(r.Context())
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "diagnostics_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "summary": summary})
}

func (s *Server) defaultPolicy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	if !s.cfg.Debug.Enabled {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
		return
	}
	if sig := security.ValidateRequest(r, s.cfg.Security.AgentSharedSecret, s.cfg.Security.RequireSignature, s.cfg.Security.SignatureMaxSkewSeconds); sig.Checked && !sig.Valid {
		s.log.Warn("mother_debug_signature_failed", map[string]any{"error": sig.Error, "remote_addr": sanitizeRemoteAddr(r.RemoteAddr)})
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "invalid_signature"})
		return
	}
	rec, err := s.store.GetPolicyByID(r.Context(), storage.DefaultPolicyID)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "policy_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policy": rec.Profile})
}

func (s *Server) policies(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/v1/policies" {
		s.notFound(w, r)
		return
	}
	if !s.cfg.Management.Enabled {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		policies, err := s.store.ListPolicies(r.Context())
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "policies_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policies": policies})
	case http.MethodPost:
		if !s.writeAuthorized(w, r) {
			return
		}
		req, ok := decodePolicyRequest(w, r)
		if !ok {
			return
		}
		if strings.TrimSpace(req.ID) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "empty_policy_id"})
			return
		}
		if err := s.store.UpsertPolicy(r.Context(), storage.PolicyRecord{ID: req.ID, Profile: req.Profile}); err != nil {
			writePolicyWriteError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policy": map[string]any{"id": req.ID, "profile_id": req.Profile.ProfileID, "version": req.Profile.Version}})
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost)
	}
}

func (s *Server) policyByID(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.Management.Enabled {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
		return
	}
	policyID := strings.Trim(strings.TrimPrefix(r.URL.Path, "/v1/policies/"), "/")
	if policyID == "" {
		s.notFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		rec, err := s.store.GetPolicyByID(r.Context(), policyID)
		if err != nil {
			status := http.StatusNotFound
			writeJSON(w, status, map[string]any{"ok": false, "error": "policy_not_found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policy": policyRecordPayload(rec)})
	case http.MethodPut:
		if !s.writeAuthorized(w, r) {
			return
		}
		req, ok := decodePolicyRequest(w, r)
		if !ok {
			return
		}
		if strings.TrimSpace(req.ID) != "" && strings.TrimSpace(req.ID) != policyID {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "policy_id_mismatch"})
			return
		}
		req.ID = policyID
		if err := s.store.UpsertPolicy(r.Context(), storage.PolicyRecord{ID: req.ID, Profile: req.Profile}); err != nil {
			writePolicyWriteError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "policy": map[string]any{"id": req.ID, "profile_id": req.Profile.ProfileID, "version": req.Profile.Version}})
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPut)
	}
}

func (s *Server) policyAssignment(w http.ResponseWriter, r *http.Request, agentID string) {
	if !s.cfg.Management.Enabled {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
		return
	}
	agentID = strings.TrimSpace(agentID)
	if agentID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "missing_agent_id"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		a, err := s.store.GetAssignment(r.Context(), agentID)
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "assignment_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "assigned": a.Assigned, "policy_id": a.PolicyID})
	case http.MethodPost:
		if !s.writeAuthorized(w, r) {
			return
		}
		var req struct {
			PolicyID string `json:"policy_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
			return
		}
		if err := s.store.AssignPolicy(r.Context(), agentID, req.PolicyID); err != nil {
			if errors.Is(err, storage.ErrPolicyNotFound) {
				writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "policy_not_found"})
				return
			}
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "policy_id": req.PolicyID, "assigned": true})
	case http.MethodDelete:
		if !s.writeAuthorized(w, r) {
			return
		}
		if err := s.store.DeleteAssignment(r.Context(), agentID); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "assignment_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "agent_id": agentID, "assigned": false})
	default:
		writeMethodNotAllowed(w, http.MethodGet+", "+http.MethodPost+", "+http.MethodDelete)
	}
}

func (s *Server) writeAuthorized(w http.ResponseWriter, r *http.Request) bool {
	if !s.cfg.Management.WriteEnabled {
		writeJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": "management writes are disabled"})
		return false
	}
	token := strings.TrimSpace(s.cfg.Management.APIToken)
	if token == "" {
		s.managementTokenWarning.Do(func() {
			s.log.Warn("mother_management_token_missing", map[string]any{"warning": "management writes enabled without api_token; allow only in explicit local staging"})
		})
		return true
	}
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "missing_management_token"})
		return false
	}
	got := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "invalid_management_token"})
		return false
	}
	return true
}

type policyWriteRequest struct {
	ID      string         `json:"id"`
	Profile policy.Profile `json:"profile"`
}

func decodePolicyRequest(w http.ResponseWriter, r *http.Request) (policyWriteRequest, bool) {
	var req policyWriteRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid_json"})
		return req, false
	}
	return req, true
}

func writePolicyWriteError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": safeError(err)})
}

func safeError(err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	if len(msg) > 160 {
		msg = msg[:160]
	}
	return msg
}

func policyRecordPayload(rec storage.PolicyRecord) map[string]any {
	return map[string]any{
		"id":         rec.ID,
		"profile_id": rec.Profile.ProfileID,
		"version":    rec.Profile.Version,
		"source":     rec.Profile.Source,
		"is_default": rec.IsDefault,
		"profile":    rec.Profile,
	}
}

func (s *Server) notFound(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "not_found"})
}

func writeMethodNotAllowed(w http.ResponseWriter, allowed string) {
	w.Header().Set("Allow", allowed)
	writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method_not_allowed"})
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func sanitizeRemoteAddr(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return remoteAddr
}

func JSONText(payload map[string]any) string {
	b, err := json.Marshal(payload)
	if err != nil {
		return fmt.Sprintf(`{"ok":false,"error":"%s"}`, err.Error())
	}
	return string(b)
}
