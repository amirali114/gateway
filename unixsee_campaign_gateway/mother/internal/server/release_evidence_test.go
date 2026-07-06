package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"unixsee-campaign-gateway/mother/internal/config"
)

func TestReleaseEvidencePostRequiresManagementToken(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	body := `{"gate_id":"php-wrapper-model","status":"pass","summary":"validated on staging webroot"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/release/evidence", bytes.NewBufferString(body))
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token got %d body=%s", w.Code, w.Body.String())
	}
}

func TestReleaseEvidencePostAndGetRoundTrip(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	body := `{"gate_id":"backup-restore-drill","status":"pass","summary":"drill-backup-restore-core.sh passed 2026-07-01","artifact_refs":["s3://evidence/drill-2026-07-01.log"]}`
	req := httptest.NewRequest(http.MethodPost, "/v1/release/evidence", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer test-management-token")
	req.Header.Set("X-Unixsee-Actor-Username", "ops-alice")
	req.Header.Set("X-Unixsee-Actor-Role", "operator")
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	if bytes.Contains(w.Body.Bytes(), []byte("test-management-token")) {
		t.Fatalf("token leaked in response: %s", w.Body.String())
	}
	var created struct {
		OK       bool `json:"ok"`
		Evidence struct {
			ID        string `json:"id"`
			CreatedBy string `json:"created_by"`
		} `json:"evidence"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &created); err != nil {
		t.Fatalf("json: %v", err)
	}
	if created.Evidence.ID == "" {
		t.Fatalf("expected generated evidence id: %s", w.Body.String())
	}
	if created.Evidence.CreatedBy != "ops-alice:operator" {
		t.Fatalf("expected actor recorded, got %q", created.Evidence.CreatedBy)
	}

	getW := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(getW, httptest.NewRequest(http.MethodGet, "/v1/release/evidence/"+created.Evidence.ID, nil))
	if getW.Code != http.StatusOK {
		t.Fatalf("expected 200 on get got %d body=%s", getW.Code, getW.Body.String())
	}

	listW := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(listW, httptest.NewRequest(http.MethodGet, "/v1/release/evidence", nil))
	if listW.Code != http.StatusOK || !bytes.Contains(listW.Body.Bytes(), []byte(created.Evidence.ID)) {
		t.Fatalf("expected list to include created evidence: %s", listW.Body.String())
	}
}

func TestReleaseEvidenceRejectsUnsupportedGateAndStatus(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	cases := []string{
		`{"gate_id":"not-a-real-gate","status":"pass","summary":"x"}`,
		`{"gate_id":"php-wrapper-model","status":"maybe","summary":"x"}`,
		`{"gate_id":"php-wrapper-model","status":"pass","summary":""}`,
	}
	for _, body := range cases {
		req := httptest.NewRequest(http.MethodPost, "/v1/release/evidence", bytes.NewBufferString(body))
		req.Header.Set("Authorization", "Bearer test-management-token")
		w := httptest.NewRecorder()
		s.httpSrv.Handler.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for body=%s got %d body=%s", body, w.Code, w.Body.String())
		}
	}
}

func TestReleaseGatesReflectEvidenceStatuses(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	// With no evidence recorded, gates must remain unknown/warn, never a
	// falsely-ready pass.
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/release-gates", nil))
	var initial struct {
		Gates []ReleaseGate `json:"gates"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &initial); err != nil {
		t.Fatalf("json: %v", err)
	}
	if got := releaseGateStatusByID(initial.Gates, "php-wrapper-model"); got != gateUnknown {
		t.Fatalf("expected gateUnknown before evidence, got %s", got)
	}

	post := func(body string) {
		req := httptest.NewRequest(http.MethodPost, "/v1/release/evidence", bytes.NewBufferString(body))
		req.Header.Set("Authorization", "Bearer test-management-token")
		w := httptest.NewRecorder()
		s.httpSrv.Handler.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
	}

	post(`{"gate_id":"php-wrapper-model","status":"pass","summary":"validated"}`)
	post(`{"gate_id":"backup-restore-drill","status":"fail","summary":"restore failed on client db"}`)
	post(`{"gate_id":"release-evidence-collected","status":"accepted_risk","summary":"partial evidence, risk accepted by release manager"}`)

	w2 := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w2, httptest.NewRequest(http.MethodGet, "/v1/release-gates", nil))
	var after struct {
		Gates []ReleaseGate `json:"gates"`
	}
	if err := json.Unmarshal(w2.Body.Bytes(), &after); err != nil {
		t.Fatalf("json: %v", err)
	}
	if got := releaseGateStatusByID(after.Gates, "php-wrapper-model"); got != gatePass {
		t.Fatalf("expected gatePass after pass evidence, got %s", got)
	}
	if got := releaseGateStatusByID(after.Gates, "backup-restore-drill"); got != gateFail {
		t.Fatalf("expected gateFail after fail evidence, got %s", got)
	}
	if got := releaseGateStatusByID(after.Gates, "release-evidence-collected"); got != gateWarn {
		t.Fatalf("expected gateWarn (accepted risk) evidence, got %s", got)
	}
}
