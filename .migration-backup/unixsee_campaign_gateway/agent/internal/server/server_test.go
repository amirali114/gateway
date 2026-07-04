package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"unixsee-campaign-gateway/agent/internal/config"
	"unixsee-campaign-gateway/agent/internal/logger"
	"unixsee-campaign-gateway/agent/internal/policy"
	"unixsee-campaign-gateway/agent/internal/stats"
	"unixsee-campaign-gateway/agent/internal/storage"
)

func newTestServer(t *testing.T) *Server {
	t.Helper()
	return newTestServerWithDiagnostics(t, stats.DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 100, ExposeRecentMismatches: true, IncludeIP: false, IncludeUserAgent: false})
}

func newTestServerWithDiagnostics(t *testing.T, diag stats.DiagnosticsConfig) *Server {
	t.Helper()
	dir := t.TempDir()
	cfg := config.Defaults()
	cfg.Storage.Engine = storage.EngineJSONL
	cfg.Storage.Path = filepath.Join(dir, "agent-events")
	cfg.Logging.Path = filepath.Join(dir, "agent.log")
	cfg.Decision.Enabled = true
	cfg.Decision.Mode = "comparator"
	cfg.Decision.DefaultAction = "allow"
	cfg.Decision.CompareUnknown = false
	cfg.Diagnostics.Enabled = diag.Enabled
	cfg.Diagnostics.RecentMismatchLimit = diag.RecentMismatchLimit
	cfg.Diagnostics.ExposeRecentMismatches = diag.ExposeRecentMismatches
	cfg.Diagnostics.IncludeIP = diag.IncludeIP
	cfg.Diagnostics.IncludeUserAgent = diag.IncludeUserAgent
	log, err := logger.New(cfg.Logging.Path, "info")
	if err != nil {
		t.Fatalf("logger: %v", err)
	}
	t.Cleanup(func() { _ = log.Close() })
	store, err := storage.NewStore(storage.Options{Engine: cfg.Storage.Engine, Path: cfg.Storage.Path, SyncWrites: false})
	if err != nil {
		t.Fatalf("store factory: %v", err)
	}
	if err := store.Open(context.Background()); err != nil {
		t.Fatalf("store open: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })
	return New(cfg, log, store, stats.NewWithDiagnostics(diag))
}

func validPayload(action string, path string) []byte {
	return validPayloadWithQuery(action, path, "a=1")
}

func validPayloadWithQuery(action string, path string, query string) []byte {
	return []byte(`{"schema_version":"r3.shadow.v1","timestamp":1710000000,"site":{"host":"example.com","scheme":"https"},"request":{"ip":"1.2.3.4","method":"GET","path":"` + path + `","query":"` + query + `","user_agent":"Mozilla/5.0","referer":"","accept":"","is_ajax":false},"php_decision":{"action":"` + action + `","reason":"valid_ticket","status":200,"retry_after":5},"runtime":{"storage_available":true,"storage_fail_mode":"open","gateway_enabled":true,"campaign_enabled":true}}`)
}

func TestHealthEndpoint(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	s.healthz(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestReadyzIncludesStorageEngine(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	w := httptest.NewRecorder()
	s.readyz(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("readyz json: %v", err)
	}
	if payload["storage_engine"] != storage.EngineJSONL {
		t.Fatalf("expected storage_engine jsonl, got %+v", payload)
	}
	if payload["policy"] != "ok" {
		t.Fatalf("expected policy ok in readyz, got %+v", payload)
	}
	if payload["policy_source"] != "local" || payload["policy_status"] != "local" {
		t.Fatalf("expected local policy status in readyz, got %+v", payload)
	}
}

func TestShadowEndpointAcceptsValidPayloadResponseIncludesDecisionAndComparison(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayload("allow", "/product/test")))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response json: %v", err)
	}
	decisionPayload, ok := payload["agent_decision"].(map[string]any)
	if !ok || decisionPayload["action"] != "allow" || decisionPayload["reason"] != "policy_product_route" {
		t.Fatalf("missing/invalid agent_decision: %+v", payload)
	}
	comparison, ok := payload["comparison"].(map[string]any)
	if !ok || comparison["compared"] != true || comparison["match"] != true {
		t.Fatalf("missing/invalid comparison: %+v", payload)
	}
}

func TestStatsIncludeComparisonCounters(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayload("queue", "/product/test")))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	statsReq := httptest.NewRequest(http.MethodGet, "/v1/stats", nil)
	statsRec := httptest.NewRecorder()
	s.statsEndpoint(statsRec, statsReq)
	if statsRec.Code != http.StatusOK {
		t.Fatalf("stats expected 200, got %d", statsRec.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(statsRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("stats json: %v", err)
	}
	if payload["received"].(float64) != 1 || payload["stored"].(float64) != 1 {
		t.Fatalf("unexpected stats: %+v", payload)
	}
	if payload["storage_engine"] != storage.EngineJSONL {
		t.Fatalf("expected storage engine in stats, got %+v", payload)
	}
	policySummary, ok := payload["policy"].(map[string]any)
	if !ok || policySummary["source"] != "local" || policySummary["profile_id"] != "default-local-shadow" || policySummary["status"] != "local" {
		t.Fatalf("policy summary missing from stats: %+v", payload)
	}
	comparison, ok := payload["comparison"].(map[string]any)
	if !ok {
		t.Fatalf("comparison missing from stats: %+v", payload)
	}
	if comparison["compared"].(float64) != 1 || comparison["mismatched"].(float64) != 1 {
		t.Fatalf("unexpected comparison counters: %+v", comparison)
	}
}

func TestPolicyEffectiveEndpointReturnsSummary(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodGet, "/v1/policy/effective", nil)
	w := httptest.NewRecorder()
	s.policyEffectiveEndpoint(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("policy json: %v", err)
	}
	policyPayload, ok := payload["policy"].(map[string]any)
	if !ok || policyPayload["source"] != "local" || policyPayload["profile_id"] != "default-local-shadow" || policyPayload["version"].(float64) != 1 || policyPayload["status"] != "local" {
		t.Fatalf("unexpected effective policy response: %+v", payload)
	}
	summary, ok := payload["summary"].(map[string]any)
	if !ok || summary["gateway_enabled"] != true || summary["queue_enabled"] != false || summary["bot_enabled"] != false {
		t.Fatalf("unexpected policy summary: %+v", payload)
	}
}

func TestPolicyEffectiveWrongMethodReturns405(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/policy/effective", nil)
	w := httptest.NewRecorder()
	s.policyEffectiveEndpoint(w, r)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", w.Code)
	}
}

func TestShadowEndpointInvalidJSONReturns400(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader([]byte(`{bad json`)))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestShadowEndpointWrongMethodReturns405(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodGet, "/v1/shadow/decision", nil)
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", w.Code)
	}
}

func TestDiagnosticsEndpointReturns200AndHidesSensitiveFieldsByDefault(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayload("queue", "/product/test?a=secret")))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("shadow expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	diagReq := httptest.NewRequest(http.MethodGet, "/v1/comparison/diagnostics", nil)
	diagRec := httptest.NewRecorder()
	s.comparisonDiagnosticsEndpoint(diagRec, diagReq)
	if diagRec.Code != http.StatusOK {
		t.Fatalf("diagnostics expected 200, got %d body=%s", diagRec.Code, diagRec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(diagRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("diagnostics json: %v", err)
	}
	if payload["diagnostics_enabled"] != true {
		t.Fatalf("diagnostics should be enabled: %+v", payload)
	}
	recent := payload["recent_mismatches"].([]any)
	if len(recent) != 1 {
		t.Fatalf("expected one recent mismatch, got %+v", recent)
	}
	item := recent[0].(map[string]any)
	if item["ip"] != nil || item["user_agent"] != nil {
		t.Fatalf("ip/user_agent should be hidden by default: %+v", item)
	}
	if item["path"] != "/product/test" {
		t.Fatalf("query string should be stripped from diagnostics path: %+v", item)
	}
}

func TestDiagnosticsEndpointIncludesSensitiveFieldsOnlyWhenEnabled(t *testing.T) {
	s := newTestServerWithDiagnostics(t, stats.DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 100, ExposeRecentMismatches: true, IncludeIP: true, IncludeUserAgent: true})
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayload("queue", "/product/test")))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("shadow expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	diagReq := httptest.NewRequest(http.MethodGet, "/v1/comparison/diagnostics", nil)
	diagRec := httptest.NewRecorder()
	s.comparisonDiagnosticsEndpoint(diagRec, diagReq)
	if diagRec.Code != http.StatusOK {
		t.Fatalf("diagnostics expected 200, got %d body=%s", diagRec.Code, diagRec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(diagRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("diagnostics json: %v", err)
	}
	recent := payload["recent_mismatches"].([]any)
	item := recent[0].(map[string]any)
	if item["ip"] != "1.2.3.4" || item["user_agent"] != "Mozilla/5.0" {
		t.Fatalf("expected ip/user_agent when explicitly enabled: %+v", item)
	}
}

func TestDiagnosticsEndpointWrongMethodReturns405(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/comparison/diagnostics", nil)
	w := httptest.NewRecorder()
	s.comparisonDiagnosticsEndpoint(w, r)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", w.Code)
	}
}

func TestDiagnosticsEndpointUsesQueryKeysButDoesNotExposeQueryValues(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayloadWithQuery("queue", "/", "wc-api=WC_Gateway_Secret&token=secret")))
	w := httptest.NewRecorder()
	s.shadowDecision(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("shadow expected 200, got %d body=%s", w.Code, w.Body.String())
	}

	diagReq := httptest.NewRequest(http.MethodGet, "/v1/comparison/diagnostics", nil)
	diagRec := httptest.NewRecorder()
	s.comparisonDiagnosticsEndpoint(diagRec, diagReq)
	if diagRec.Code != http.StatusOK {
		t.Fatalf("diagnostics expected 200, got %d body=%s", diagRec.Code, diagRec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(diagRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("diagnostics json: %v", err)
	}
	classes := payload["mismatch_by_path_class"].(map[string]any)
	if classes[stats.PathClassCheckout].(float64) != 1 {
		t.Fatalf("expected checkout classification from wc-api query key: %+v", classes)
	}
	body := diagRec.Body.String()
	if bytes.Contains([]byte(body), []byte("WC_Gateway_Secret")) || bytes.Contains([]byte(body), []byte("token=secret")) {
		t.Fatalf("diagnostics must not expose query values: %s", body)
	}
	recent := payload["recent_mismatches"].([]any)
	item := recent[0].(map[string]any)
	if item["path"] != "/" {
		t.Fatalf("recent mismatch path must not include query: %+v", item)
	}
}

func TestPolicySyncStatusEndpointWorksWithLocalPolicy(t *testing.T) {
	s := newTestServer(t)
	r := httptest.NewRequest(http.MethodGet, "/v1/policy/sync-status", nil)
	w := httptest.NewRecorder()
	s.policySyncStatusEndpoint(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("sync status json: %v", err)
	}
	syncPayload := payload["sync"].(map[string]any)
	if syncPayload["enabled"] != false {
		t.Fatalf("expected sync disabled for local policy: %+v", syncPayload)
	}
	if syncPayload["last_error"] != "" {
		t.Fatalf("local sync status should not contain error: %+v", syncPayload)
	}
}

func TestPolicySyncStatusEndpointWorksWithMotherPolicyFresh(t *testing.T) {
	dir := t.TempDir()
	cfg := config.Defaults()
	cfg.Storage.Engine = storage.EngineJSONL
	cfg.Storage.Path = filepath.Join(dir, "agent-events")
	cfg.Logging.Path = filepath.Join(dir, "agent.log")
	cfg.PolicyConfiguredSource = policy.SourceMother
	cfg.Policy = policy.DefaultLocalProfile()
	cfg.Policy.Source = policy.SourceMother
	cfg.Policy.ProfileID = "mother-default-shadow"
	cfg.PolicyStatus = policy.StatusFresh
	cfg.Mother.Enabled = true
	cfg.Mother.BaseURL = "http://user:pass@127.0.0.1:8732"
	cfg.Mother.AgentID = "local-dev-agent"
	cfg.Mother.SharedSecret = "super-secret"
	cfg.Mother.PolicyCachePath = filepath.Join(dir, "last-known-policy.json")
	log, err := logger.New(cfg.Logging.Path, "info")
	if err != nil {
		t.Fatalf("logger: %v", err)
	}
	t.Cleanup(func() { _ = log.Close() })
	store, err := storage.NewStore(storage.Options{Engine: cfg.Storage.Engine, Path: cfg.Storage.Path})
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	if err := store.Open(context.Background()); err != nil {
		t.Fatalf("store open: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })
	s := New(cfg, log, store, stats.NewWithDiagnostics(stats.DiagnosticsConfig{Enabled: true, RecentMismatchLimit: 100, ExposeRecentMismatches: true}))

	w := httptest.NewRecorder()
	s.policySyncStatusEndpoint(w, httptest.NewRequest(http.MethodGet, "/v1/policy/sync-status", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if bytes.Contains([]byte(body), []byte("super-secret")) || bytes.Contains([]byte(body), []byte("user:pass")) {
		t.Fatalf("sync status exposed secret or credentials: %s", body)
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("sync status json: %v", err)
	}
	syncPayload := payload["sync"].(map[string]any)
	if syncPayload["enabled"] != true || syncPayload["mother_base_url"] != "http://127.0.0.1:8732" || syncPayload["last_attempt_at"] == "" || syncPayload["last_success_at"] == "" {
		t.Fatalf("unexpected mother sync status: %+v", syncPayload)
	}
	policyPayload := payload["policy"].(map[string]any)
	if policyPayload["status"] != policy.StatusFresh || policyPayload["source"] != policy.SourceMother {
		t.Fatalf("unexpected policy in sync status: %+v", policyPayload)
	}
}

func TestPolicySyncStatusStoresSanitizedLastError(t *testing.T) {
	s := newTestServer(t)
	s.cfg.PolicyConfiguredSource = policy.SourceMother
	s.cfg.Mother.Enabled = true
	s.cfg.Mother.SharedSecret = "super-secret"
	s.cfg.PolicyError = "fetch failed with super-secret token"
	s.initPolicySyncStatus()
	w := httptest.NewRecorder()
	s.policySyncStatusEndpoint(w, httptest.NewRequest(http.MethodGet, "/v1/policy/sync-status", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if bytes.Contains([]byte(body), []byte("super-secret")) {
		t.Fatalf("secret leaked in sync status: %s", body)
	}
	if !bytes.Contains([]byte(body), []byte("[redacted]")) {
		t.Fatalf("expected redacted error, got %s", body)
	}
}

func TestPolicySyncStatusWrongMethodReturns405(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policySyncStatusEndpoint(w, httptest.NewRequest(http.MethodPost, "/v1/policy/sync-status", nil))
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 got %d", w.Code)
	}
}

func TestRefreshPolicyOnceUpdatesLastAttemptAt(t *testing.T) {
	motherSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/local-dev-agent/policy" {
			t.Fatalf("unexpected mother policy path %s", r.URL.Path)
		}
		p := policy.DefaultLocalProfile()
		p.Source = policy.SourceMother
		p.ProfileID = "mother-default-shadow"
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "policy": p})
	}))
	defer motherSrv.Close()

	s := newTestServer(t)
	s.cfg.PolicyConfiguredSource = policy.SourceMother
	s.cfg.Mother.Enabled = true
	s.cfg.Mother.BaseURL = motherSrv.URL
	s.cfg.Mother.AgentID = "local-dev-agent"
	s.cfg.Mother.PolicyPullTimeoutMS = 500
	s.cfg.Mother.PolicyCachePath = filepath.Join(t.TempDir(), "last-known-policy.json")
	s.initPolicySyncStatus()

	s.syncMu.Lock()
	s.policySync.LastAttemptAt = time.Time{}
	s.policySync.LastSuccessAt = time.Time{}
	s.syncMu.Unlock()

	s.refreshPolicyOnce(context.Background())

	status := s.currentPolicySyncStatus()
	if status.LastAttemptAt.IsZero() {
		t.Fatalf("expected last_attempt_at to be updated")
	}
	if status.LastSuccessAt.IsZero() {
		t.Fatalf("expected last_success_at to be updated")
	}
	if status.LastError != "" {
		t.Fatalf("expected empty last_error, got %q", status.LastError)
	}
}

func TestTelemetryPayloadContainsStatsAndPolicy(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.shadowDecision(w, httptest.NewRequest(http.MethodPost, "/v1/shadow/decision", bytes.NewReader(validPayload("allow", "/product/test"))))
	if w.Code != http.StatusOK {
		t.Fatalf("shadow expected 200 got %d", w.Code)
	}
	s.cfg.Mother.AgentID = "iran-staging-agent"
	payload := s.telemetryPayload()
	if payload["agent_id"] != "iran-staging-agent" || payload["mode"] != "shadow" {
		t.Fatalf("unexpected telemetry identity: %+v", payload)
	}
	shadowPayload := payload["shadow"].(map[string]any)
	if shadowPayload["received"].(uint64) != 1 || shadowPayload["stored"].(uint64) != 1 {
		t.Fatalf("unexpected shadow telemetry: %+v", shadowPayload)
	}
	policyPayload := payload["policy"].(map[string]any)
	if policyPayload["source"] != "local" || policyPayload["status"] != "local" {
		t.Fatalf("unexpected policy payload: %+v", policyPayload)
	}
}

func TestTelemetryPushSendsPayloadToMother(t *testing.T) {
	var seenPath string
	var seenAgent string
	var payload map[string]any
	mother := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenPath = r.URL.Path
		seenAgent = r.Header.Get("X-Unixsee-Agent-ID")
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST got %s", r.Method)
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode telemetry: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer mother.Close()

	s := newTestServer(t)
	s.cfg.Mother.Enabled = true
	s.cfg.Mother.BaseURL = mother.URL
	s.cfg.Mother.AgentID = "iran-staging-agent"
	s.cfg.Telemetry.Enabled = true
	s.cfg.Telemetry.PushTimeoutMS = 500
	s.pushTelemetryOnce(context.Background())

	if seenPath != "/v1/agents/iran-staging-agent/telemetry" || seenAgent != "iran-staging-agent" {
		t.Fatalf("unexpected telemetry request path=%s agent=%s", seenPath, seenAgent)
	}
	if payload["agent_id"] != "iran-staging-agent" || payload["mode"] != "shadow" {
		t.Fatalf("unexpected telemetry payload: %+v", payload)
	}
}
