package server

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"unixsee-campaign-gateway/mother/internal/storage"
)

func (s *Server) alertEvaluationLoop() {
	interval := time.Duration(s.cfg.Alerts.EvaluationIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 60 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			if err := s.evaluateAlerts(ctx, "periodic"); err != nil {
				s.log.Warn("alert_evaluation_failed", map[string]any{"error": safeError(err)})
			}
			cancel()
		case <-s.alertStopCh:
			return
		}
	}
}

func (s *Server) alerts(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/v1/alerts" {
		s.notFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := s.store.ListAlerts(r.Context(), storage.AlertFilter{Status: r.URL.Query().Get("status"), AgentID: r.URL.Query().Get("agent_id"), Scope: r.URL.Query().Get("scope"), Limit: limit})
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "alerts_unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "alerts": items})
}

func (s *Server) alertRoutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/v1/alerts/"), "/")
	if rest == "" {
		s.notFound(w, r)
		return
	}
	if rest == "summary" {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w, http.MethodGet)
			return
		}
		summary, err := s.store.AlertSummary(r.Context())
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "alert_summary_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, summary)
		return
	}
	if rest == "evaluate" {
		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w, http.MethodPost)
			return
		}
		if !s.writeAuthorized(w, r) {
			return
		}
		if err := s.evaluateAlerts(r.Context(), "operator"); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false, "error": "alert_evaluation_failed"})
			return
		}
		_ = s.store.AddEvent(r.Context(), "mother", "alert_evaluation_triggered", "info", "Alert evaluation triggered", map[string]any{"actor": actorFromRequest(r)})
		summary, _ := s.store.AlertSummary(r.Context())
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "summary": summary})
		return
	}
	parts := strings.Split(rest, "/")
	alertID := strings.TrimSpace(parts[0])
	if alertID == "" {
		s.notFound(w, r)
		return
	}
	if len(parts) == 1 {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w, http.MethodGet)
			return
		}
		rec, err := s.store.GetAlert(r.Context(), alertID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "alert_not_found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "alert": rec})
		return
	}
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w, http.MethodPost)
		return
	}
	if !s.writeAuthorized(w, r) {
		return
	}
	action := strings.TrimSpace(parts[1])
	var (
		rec storage.AlertRecord
		err error
	)
	switch action {
	case "resolve":
		rec, err = s.store.ResolveAlert(r.Context(), alertID, actorFromRequest(r))
	case "mute":
		rec, err = s.store.MuteAlert(r.Context(), alertID, actorFromRequest(r))
	case "unmute":
		rec, err = s.store.UnmuteAlert(r.Context(), alertID, actorFromRequest(r))
	default:
		s.notFound(w, r)
		return
	}
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "alert_not_found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "alert": rec})
}

func (s *Server) evaluateAlerts(ctx context.Context, source string) error {
	if s.store == nil {
		return fmt.Errorf("storage unavailable")
	}
	if !s.cfg.Alerts.Enabled {
		return nil
	}
	active, _ := s.store.ListAlerts(ctx, storage.AlertFilter{Status: storage.AlertStatusActive, Limit: 1000})
	activeByFP := map[string]storage.AlertRecord{}
	for _, a := range active {
		activeByFP[a.Fingerprint] = a
	}
	reconcile := func(condition bool, alert storage.AlertRecord) {
		if alert.Fingerprint == "" {
			alert.Fingerprint = alertKey(alert.Scope, alert.Type, alert.AgentID)
		}
		if condition {
			_, created, err := s.store.UpsertAlert(ctx, alert)
			if err == nil && created {
				_ = s.store.AddEvent(ctx, emptyTo(alert.AgentID, "mother"), "alert_created", severityToEvent(alert.Severity), alert.Title, map[string]any{"alert_type": alert.Type, "scope": alert.Scope, "fingerprint": alert.Fingerprint, "source": source})
			}
			return
		}
		if existing, ok := activeByFP[alert.Fingerprint]; ok {
			_, _ = s.store.ResolveAlert(ctx, existing.ID, "alert-engine")
		}
	}

	st := s.store.StorageStatus(ctx)
	reconcile(!st.OK, alert("storage", "storage_unhealthy", "critical", "سلامت storage مشکل دارد", "Mother storage unhealthy", map[string]any{"engine": st.Engine, "last_error": st.LastError}))
	reconcile(st.Engine == storage.EngineMemory || st.Engine == "" || st.Engine == "unknown", alert("storage", "storage_volatile", "warn", "storage پایدار نیست", "Storage engine is memory or unknown; staging persistence may be lost", map[string]any{"engine": st.Engine}))
	reconcile(st.Engine == storage.EnginePostgres && !st.DatabaseConnected, alert("storage", "postgres_unavailable", "critical", "PostgreSQL در دسترس نیست", "PostgreSQL storage profile is configured but database is not connected", map[string]any{"engine": st.Engine, "migration_status": st.MigrationStatus}))
	reconcile(strings.TrimSpace(st.LastError) != "", alert("storage", "storage_save_error", "critical", "خطای ذخیره‌سازی ثبت شده", "Storage reported a last_error", map[string]any{"engine": st.Engine, "last_error": st.LastError}))

	reconcile(s.cfg.Management.WriteEnabled && strings.TrimSpace(s.cfg.Management.APIToken) == "", alert("security", "management_token_missing", "critical", "توکن مدیریت Mother تنظیم نشده", "Mother write API is enabled without a configured management token", nil))
	reconcile(strings.TrimSpace(s.cfg.Mother.ListenAddr) != "" && strings.HasPrefix(s.cfg.Mother.ListenAddr, "0.0.0.0:") && !s.cfg.Security.AllowRemoteBind, alert("security", "mother_remote_bind_unexpected", "critical", "Bind ریموت Mother بدون اجازه", "Mother is configured for remote bind without allow_remote_bind", map[string]any{"listen_addr": s.cfg.Mother.ListenAddr}))

	agents, _ := s.store.ListAgents(ctx)
	now := time.Now().UTC()
	staleAfter := time.Duration(defaultInt(s.cfg.Alerts.StaleAfterSeconds, 90)) * time.Second
	criticalStale := time.Duration(defaultInt(s.cfg.Alerts.CriticalStaleAfterSeconds, 300)) * time.Second
	for _, a := range agents {
		missing := a.LastTelemetryAt.IsZero()
		reconcile(missing, agentAlert(a.AgentID, "agent", "telemetry_missing", "warn", "تلِمتری Agent هنوز دریافت نشده", "Agent exists but no telemetry has been received yet", nil))
		age := now.Sub(a.LastTelemetryAt)
		reconcile(!missing && age > staleAfter && age <= criticalStale, agentAlert(a.AgentID, "agent", "telemetry_stale", "warn", "تلِمتری Agent قدیمی شده", "Last telemetry is older than stale threshold", map[string]any{"age_seconds": int(age.Seconds())}))
		reconcile(!missing && age > criticalStale, agentAlert(a.AgentID, "agent", "telemetry_critical_stale", "critical", "تلِمتری Agent بحرانی قدیمی است", "Last telemetry is older than critical stale threshold", map[string]any{"age_seconds": int(age.Seconds())}))
		reconcile(a.ConfigSyncStatus == "stale", agentAlert(a.AgentID, "rollout", "agent_policy_stale", "warn", "وضعیت policy/config Agent تازه نیست", "Agent policy/config sync status is stale", map[string]any{"config_sync_status": a.ConfigSyncStatus}))
		reconcile(a.LastMismatched > 0, agentAlert(a.AgentID, "agent", "shadow_mismatch_detected", "warn", "Mismatch در shadow دیده شد", "Shadow comparison reported mismatches", map[string]any{"mismatched": a.LastMismatched, "match_rate": a.LastMatchRate}))
		reconcile(a.LastTelemetryAt.IsZero() == false && a.LastMatchRate > 0 && a.LastMatchRate < 95, agentAlert(a.AgentID, "agent", "shadow_match_rate_low", "warn", "نرخ تطبیق shadow پایین است", "Shadow match rate is below 95 percent", map[string]any{"match_rate": a.LastMatchRate}))
		if tel, err := s.store.GetTelemetry(ctx, a.AgentID); err == nil {
			reconcile(tel.Payload.Shadow.InvalidJSON > 0, agentAlert(a.AgentID, "agent", "invalid_json_detected", "warn", "JSON نامعتبر در Agent ثبت شده", "Agent telemetry reports invalid_json > 0", map[string]any{"invalid_json": tel.Payload.Shadow.InvalidJSON}))
			reconcile(tel.Payload.Shadow.SignatureFailed > 0, agentAlert(a.AgentID, "security", "signature_failed_detected", "critical", "خطای signature ثبت شده", "Agent telemetry reports signature_failed > 0", map[string]any{"signature_failed": tel.Payload.Shadow.SignatureFailed}))
			storageOK := true
			if v, ok := tel.Payload.Storage["ok"].(bool); ok {
				storageOK = v
			}
			reconcile(!storageOK, agentAlert(a.AgentID, "storage", "agent_storage_unhealthy", "critical", "Storage سمت Agent سالم نیست", "Agent telemetry reported storage ok=false", map[string]any{"agent_id": a.AgentID}))
		}
		activeCfg, _ := s.store.GetActiveConfig(ctx, a.AgentID)
		if activeCfg.Version > 0 {
			publishedAge := now.Sub(activeCfg.PublishedAt)
			reconcile(activeCfg.DeliveredAt.IsZero() && publishedAge > 90*time.Second, agentAlert(a.AgentID, "rollout", "config_pending_delivery", "warn", "تحویل config هنوز انجام نشده", "Active config has not been delivered within 90 seconds", map[string]any{"version": activeCfg.Version, "age_seconds": int(publishedAge.Seconds())}))
			deliveredAge := now.Sub(activeCfg.DeliveredAt)
			reconcile(!activeCfg.DeliveredAt.IsZero() && activeCfg.AcknowledgedAt.IsZero() && deliveredAge > 180*time.Second && publishedAge <= 10*time.Minute, agentAlert(a.AgentID, "rollout", "config_pending_ack", "warn", "ack config هنوز دریافت نشده", "Delivered config has not been acknowledged within 180 seconds", map[string]any{"version": activeCfg.Version, "age_seconds": int(deliveredAge.Seconds())}))
			reconcile(activeCfg.AcknowledgedAt.IsZero() && publishedAge > 10*time.Minute, agentAlert(a.AgentID, "rollout", "config_stale", "critical", "config فعال stale شده", "Active config has not been acknowledged within 10 minutes", map[string]any{"version": activeCfg.Version, "age_seconds": int(publishedAge.Seconds())}))
			reconcile(activeCfg.Source == storage.ConfigSourceRollback && now.Sub(activeCfg.PublishedAt) < 24*time.Hour, agentAlert(a.AgentID, "rollout", "rollback_recent", "info", "Rollback اخیر منتشر شده", "A rollback config was published recently", map[string]any{"version": activeCfg.Version}))
		}
	}
	return nil
}

func alert(scope, typ, severity, title, message string, metadata map[string]any) storage.AlertRecord {
	return storage.AlertRecord{Scope: scope, Type: typ, Severity: severity, Status: storage.AlertStatusActive, Title: title, Message: message, Metadata: metadata, Fingerprint: alertKey(scope, typ, "")}
}

func agentAlert(agentID, scope, typ, severity, title, message string, metadata map[string]any) storage.AlertRecord {
	rec := alert(scope, typ, severity, title, message, metadata)
	rec.AgentID = agentID
	rec.Fingerprint = alertKey(scope, typ, agentID)
	return rec
}

func alertKey(scope string, typ string, agentID string) string {
	parts := []string{strings.ToLower(strings.TrimSpace(scope)), strings.ToLower(strings.TrimSpace(typ)), strings.TrimSpace(agentID)}
	return strings.Join(parts, ":")
}

func severityToEvent(severity string) string {
	if severity == storage.AlertSeverityCritical {
		return "error"
	}
	if severity == storage.AlertSeverityWarn {
		return "warn"
	}
	return "info"
}

func emptyTo(v string, fallback string) string {
	if strings.TrimSpace(v) == "" {
		return fallback
	}
	return v
}

func defaultInt(v int, fallback int) int {
	if v <= 0 {
		return fallback
	}
	return v
}
