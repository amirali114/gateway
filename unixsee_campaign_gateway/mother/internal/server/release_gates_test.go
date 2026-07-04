package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"unixsee-campaign-gateway/mother/internal/config"
)

func TestReleaseGatesEndpointReturnsSummary(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/release-gates", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var out struct {
		OK      bool               `json:"ok"`
		Gates   []ReleaseGate      `json:"gates"`
		Summary ReleaseGateSummary `json:"summary"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	if !out.OK || len(out.Gates) == 0 || out.Summary.Total == 0 {
		t.Fatalf("expected gates and summary body=%s", w.Body.String())
	}
}

func TestReleaseGatesSummaryFailsOnMissingManagementToken(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = ""
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/release-gates/summary", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var out ReleaseGateSummary
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	if out.Fail == 0 || len(out.Blockers) == 0 || out.Label != "مسدود" {
		t.Fatalf("expected blocker for missing management token: %+v", out)
	}
}

func TestHealthReportIncludesReleaseGateSummary(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/health/report", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	if _, ok := out["release_gate_summary"]; !ok {
		t.Fatalf("release_gate_summary missing body=%s", w.Body.String())
	}
	if _, ok := out["shadow_only_safety_status"]; !ok {
		t.Fatalf("shadow_only_safety_status missing body=%s", w.Body.String())
	}
}
