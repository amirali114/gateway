package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"unixsee-campaign-gateway/mother/internal/storage"
)

type ReleaseGate struct {
	ID              string         `json:"id"`
	Title           string         `json:"title"`
	Category        string         `json:"category"`
	Status          string         `json:"status"`
	Severity        string         `json:"severity"`
	Message         string         `json:"message"`
	Evidence        map[string]any `json:"evidence"`
	RemediationHint string         `json:"remediation_hint"`
	LastCheckedAt   time.Time      `json:"last_checked_at"`
}

type ReleaseGateSummary struct {
	OK          bool          `json:"ok"`
	Ready       bool          `json:"ready"`
	Label       string        `json:"label"`
	Total       int           `json:"total"`
	Pass        int           `json:"pass"`
	Warn        int           `json:"warn"`
	Fail        int           `json:"fail"`
	Skipped     int           `json:"skipped"`
	Unknown     int           `json:"unknown"`
	Blockers    []ReleaseGate `json:"blockers"`
	Warnings    []ReleaseGate `json:"warnings"`
	GeneratedAt time.Time     `json:"generated_at"`
}

const (
	gatePass    = "pass"
	gateWarn    = "warn"
	gateFail    = "fail"
	gateSkipped = "skipped"
	gateUnknown = "unknown"
)

func (s *Server) releaseGates(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/v1/release-gates" {
		s.notFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	gates := s.evaluateReleaseGates(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "gates": gates, "summary": summarizeReleaseGates(gates)})
}

func (s *Server) releaseGatesSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w, http.MethodGet)
		return
	}
	gates := s.evaluateReleaseGates(r.Context())
	writeJSON(w, http.StatusOK, summarizeReleaseGates(gates))
}

func (s *Server) evaluateReleaseGates(ctx context.Context) []ReleaseGate {
	now := time.Now().UTC()
	gate := func(id, title, category, status, severity, message, remediation string, evidence map[string]any) ReleaseGate {
		if evidence == nil {
			evidence = map[string]any{}
		}
		return ReleaseGate{ID: id, Title: title, Category: category, Status: status, Severity: severity, Message: message, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	}
	gates := []ReleaseGate{}

	if s.store == nil {
		gates = append(gates, gate("mother-storage-present", "Mother storage available", "storage", gateFail, "critical", "Mother storage is nil.", "Start Mother with a configured storage backend before beta.", nil))
		gates = append(gates, gate("dashboard-security-context", "Dashboard security context", "dashboard", gateUnknown, "warn", "Dashboard status is checked by Dashboard/runtime validation scripts.", "Run validate-dashboard-security.sh and collect-release-evidence.sh.", nil))
		return gates
	}

	readyErr := s.store.Health(ctx)
	st := s.store.StorageStatus(ctx)
	storageStatus := gatePass
	storageSeverity := "info"
	storageMsg := "Storage health check passed."
	if readyErr != nil || !st.OK {
		storageStatus = gateFail
		storageSeverity = "critical"
		storageMsg = "Storage health check failed."
	}
	gates = append(gates, gate("storage-health", "Storage health", "storage", storageStatus, storageSeverity, storageMsg, "Fix storage backend/path/permissions before beta.", map[string]any{"engine": st.Engine, "writable": st.Writable, "database_connected": st.DatabaseConnected, "last_error_set": strings.TrimSpace(st.LastError) != ""}))

	persistentStatus := gatePass
	persistentSeverity := "info"
	persistentMsg := "Storage is persistent enough for controlled staging."
	if st.Engine == storage.EngineMemory || st.Engine == "" || st.Engine == "unknown" {
		persistentStatus = gateWarn
		persistentSeverity = "warn"
		persistentMsg = "Memory/unknown storage is volatile and should not be used for beta evidence."
	}
	gates = append(gates, gate("storage-persistence", "Storage persistence", "storage", persistentStatus, persistentSeverity, persistentMsg, "Use JSON staging storage or a verified PostgreSQL profile.", map[string]any{"engine": st.Engine, "path_set": strings.TrimSpace(st.Path) != ""}))

	mgmtConfigured := strings.TrimSpace(s.cfg.Management.APIToken) != ""
	mgmtStatus := gatePass
	mgmtSeverity := "info"
	mgmtMsg := "Mother write API token is configured or writes are disabled."
	if s.cfg.Management.WriteEnabled && !mgmtConfigured {
		mgmtStatus = gateFail
		mgmtSeverity = "critical"
		mgmtMsg = "Mother write API is enabled without management token."
	}
	gates = append(gates, gate("management-token", "Mother management token", "security", mgmtStatus, mgmtSeverity, mgmtMsg, "Configure management.api_token_file/env or disable writes.", map[string]any{"write_enabled": s.cfg.Management.WriteEnabled, "token_configured": mgmtConfigured}))

	bindStatus := gatePass
	bindSeverity := "info"
	bindMsg := "Mother bind mode is local or explicitly allowed."
	if strings.HasPrefix(strings.TrimSpace(s.cfg.Mother.ListenAddr), "0.0.0.0:") && !s.cfg.Security.AllowRemoteBind {
		bindStatus = gateFail
		bindSeverity = "critical"
		bindMsg = "Mother is bound to 0.0.0.0 without explicit allow_remote_bind."
	} else if strings.HasPrefix(strings.TrimSpace(s.cfg.Mother.ListenAddr), "0.0.0.0:") {
		bindStatus = gateWarn
		bindSeverity = "warn"
		bindMsg = "Mother is remote-bound; firewall allowlist is required."
	}
	gates = append(gates, gate("mother-bind-mode", "Mother bind mode", "mother", bindStatus, bindSeverity, bindMsg, "Prefer 127.0.0.1 behind reverse proxy or restrict remote access with firewall.", map[string]any{"listen_addr": s.cfg.Mother.ListenAddr, "allow_remote_bind": s.cfg.Security.AllowRemoteBind}))

	agents, _ := s.store.ListAgents(ctx)
	summary, _ := s.store.DiagnosticsSummary(ctx)
	agentStatus := gatePass
	agentSeverity := "info"
	agentMsg := "Agent telemetry is fresh enough for beta."
	if len(agents) == 0 {
		agentStatus = gateWarn
		agentSeverity = "warn"
		agentMsg = "No Agent has registered yet."
	} else if summary.TelemetryMissing > 0 || summary.TelemetryStale > 0 {
		agentStatus = gateWarn
		agentSeverity = "warn"
		agentMsg = "Some Agent telemetry is stale or missing."
	}
	gates = append(gates, gate("agent-telemetry-freshness", "Agent telemetry freshness", "agent", agentStatus, agentSeverity, agentMsg, "Start/check Agent service and verify Mother reachability.", map[string]any{"total_agents": len(agents), "fresh": summary.TelemetryFresh, "stale": summary.TelemetryStale, "missing": summary.TelemetryMissing}))

	rolloutStatus := gatePass
	rolloutSeverity := "info"
	rolloutMsg := "Config rollout status has no stale blocker."
	if summary.ConfigsStale > 0 {
		rolloutStatus = gateFail
		rolloutSeverity = "critical"
		rolloutMsg = "At least one active config is stale/unacknowledged."
	} else if summary.ConfigsPendingDelivery > 0 {
		rolloutStatus = gateWarn
		rolloutSeverity = "warn"
		rolloutMsg = "At least one config is pending delivery."
	}
	gates = append(gates, gate("config-rollout-health", "Config rollout health", "rollout", rolloutStatus, rolloutSeverity, rolloutMsg, "Wait for delivery/ack or rollback the config before beta go/no-go.", map[string]any{"pending_delivery": summary.ConfigsPendingDelivery, "delivered": summary.ConfigsDelivered, "acknowledged": summary.ConfigsAcknowledged, "stale": summary.ConfigsStale}))

	alertSummary, _ := s.store.AlertSummary(ctx)
	alertStatus := gatePass
	alertSeverity := "info"
	alertMsg := "No active critical alerts."
	if alertSummary.Critical > 0 {
		alertStatus = gateFail
		alertSeverity = "critical"
		alertMsg = "Active critical alerts block beta readiness."
	} else if alertSummary.Warn > 0 {
		alertStatus = gateWarn
		alertSeverity = "warn"
		alertMsg = "Active warning alerts require operator review."
	}
	gates = append(gates, gate("active-alerts", "Active alerts", "observability", alertStatus, alertSeverity, alertMsg, "Review /alerts and resolve or document accepted warnings.", map[string]any{"critical": alertSummary.Critical, "warn": alertSummary.Warn, "info": alertSummary.Info, "active_total": alertSummary.ActiveTotal}))

	gates = append(gates, gate("shadow-only-config", "Shadow-only safety", "security", gatePass, "info", "Control config validation only accepts gateway.mode=shadow.", "Keep enforcement disabled; do not add enforce UI/routes.", map[string]any{"mode": "shadow", "enforcement_enabled": false}))

	var evidenceList []storage.EvidenceRecord
	if s.store != nil {
		evidenceList, _ = s.store.ListEvidence(ctx)
	}
	gates = append(gates, s.evidenceGate(evidenceList, "php-wrapper-model", "PHP wrapper/private runtime model", "php_gateway",
		"Runtime exposure must be validated on the target webroot.",
		"Run validate-php-wrapper-exposure.sh or validate-public-exposure-hardening.sh on the client server, then attach the result via the Release Evidence Ledger."))
	gates = append(gates, s.evidenceGate(evidenceList, "backup-restore-drill", "Backup/restore drill", "backup_restore",
		"Backup/restore drill evidence is not reported to Mother automatically.",
		"Run drill-backup-restore-core.sh and drill-backup-restore-client.sh before go/no-go, then attach the result via the Release Evidence Ledger."))
	gates = append(gates, s.evidenceGate(evidenceList, "release-evidence-collected", "Release evidence collected", "documentation",
		"Release evidence is collected by operator script.",
		"Run collect-release-evidence.sh and attach output via the Release Evidence Ledger."))
	return gates
}

// evidenceGate evaluates a manual-evidence gate by reading the Release
// Evidence Ledger. It never falsely reports "ready": with no evidence
// recorded the gate remains gateUnknown/warn exactly as before R10.30. An
// operator-recorded evidence status maps directly onto the gate outcome so
// operators can see exactly what was attested and by whom, without Mother
// executing or verifying anything itself.
func (s *Server) evidenceGate(evidenceList []storage.EvidenceRecord, id, title, category, unknownMessage, remediation string) ReleaseGate {
	now := time.Now().UTC()
	rec := latestEvidenceForGate(evidenceList, id)
	if rec == nil {
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gateUnknown, Severity: "warn", Message: unknownMessage, Evidence: map[string]any{"has_evidence": false}, RemediationHint: remediation, LastCheckedAt: now}
	}
	evidence := map[string]any{
		"has_evidence":    true,
		"evidence_id":     rec.ID,
		"recorded_by":     rec.CreatedBy,
		"updated_by":      rec.UpdatedBy,
		"recorded_at":     rec.CreatedAt,
		"updated_at":      rec.UpdatedAt,
		"summary":         rec.Summary,
		"attested_status": rec.Status,
	}
	if !rec.ExpiresAt.IsZero() {
		evidence["expires_at"] = rec.ExpiresAt
	}
	switch rec.Status {
	case storage.EvidenceStatusPass:
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gatePass, Severity: "info", Message: "Operator-attested evidence recorded: " + rec.Summary, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	case storage.EvidenceStatusFail:
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gateFail, Severity: "critical", Message: "Operator-attested evidence reports failure: " + rec.Summary, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	case storage.EvidenceStatusAcceptedRisk:
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gateWarn, Severity: "warn", Message: "Operator accepted risk for this gate: " + rec.Summary, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	case storage.EvidenceStatusNotApplicable:
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gateSkipped, Severity: "info", Message: "Operator marked this gate not applicable: " + rec.Summary, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	default:
		return ReleaseGate{ID: id, Title: title, Category: category, Status: gateUnknown, Severity: "warn", Message: unknownMessage, Evidence: evidence, RemediationHint: remediation, LastCheckedAt: now}
	}
}

func summarizeReleaseGates(gates []ReleaseGate) ReleaseGateSummary {
	out := ReleaseGateSummary{OK: true, Ready: true, Label: "آماده", Total: len(gates), GeneratedAt: time.Now().UTC(), Blockers: []ReleaseGate{}, Warnings: []ReleaseGate{}}
	for _, g := range gates {
		switch g.Status {
		case gatePass:
			out.Pass++
		case gateWarn:
			out.Warn++
			out.Warnings = append(out.Warnings, g)
		case gateFail:
			out.Fail++
			out.Blockers = append(out.Blockers, g)
		case gateSkipped:
			out.Skipped++
		default:
			out.Unknown++
			out.Warnings = append(out.Warnings, g)
		}
	}
	if out.Fail > 0 {
		out.Ready = false
		out.Label = "مسدود"
	} else if out.Warn > 0 || out.Unknown > 0 {
		out.Label = "نیازمند بررسی"
	}
	return out
}

func releaseGateStatusByID(gates []ReleaseGate, id string) string {
	for _, g := range gates {
		if g.ID == id {
			return g.Status
		}
	}
	return gateUnknown
}
