package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/policy"
)

func policyBody(id string, profile policy.Profile) *bytes.Reader {
	b, _ := json.Marshal(map[string]any{"id": id, "profile": profile})
	return bytes.NewReader(b)
}

func customPolicy(id string) policy.Profile {
	p := policy.DefaultRemotePolicy()
	p.ProfileID = id
	p.Version = 2
	return p
}

func TestListPoliciesReturnsDefault(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policies(w, httptest.NewRequest(http.MethodGet, "/v1/policies", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var out struct {
		Policies []map[string]any `json:"policies"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil || len(out.Policies) == 0 {
		t.Fatalf("expected policies, err=%v body=%s", err, w.Body.String())
	}
}

func TestGetDefaultPolicyRecordWorksViaManagementRead(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policyByID(w, httptest.NewRequest(http.MethodGet, "/v1/policies/default", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestPoliciesDefaultRouteReturnsManagementPolicyThroughMux(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/policies/default", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte(`"id":"default"`)) {
		t.Fatalf("expected policy id default body=%s", w.Body.String())
	}
}

func TestDebugDefaultRouteBlockedWhenDisabledThroughMux(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/debug/policies/default", nil))
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestDebugDefaultRouteWorksWhenEnabledThroughMux(t *testing.T) {
	cfg := config.Defaults()
	cfg.Debug.Enabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/debug/policies/default", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestGetCustomPolicyRecordWorksThroughMux(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/policies", policyBody("campaign-shadow-v1", customPolicy("campaign-shadow-v1"))))
	if w.Code != http.StatusOK {
		t.Fatalf("create expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/policies/campaign-shadow-v1", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("get expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCreatePolicyBlockedWhenWriteDisabled(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policies(w, httptest.NewRequest(http.MethodPost, "/v1/policies", policyBody("campaign-shadow-v1", customPolicy("campaign-shadow-v1"))))
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCreatePolicyWorksWhenWriteEnabled(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policies(w, httptest.NewRequest(http.MethodPost, "/v1/policies", policyBody("campaign-shadow-v1", customPolicy("campaign-shadow-v1"))))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCreateInvalidPolicyReturns400(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	p := customPolicy("bad")
	p.Routes.CartAction = "explode"
	w := httptest.NewRecorder()
	s.policies(w, httptest.NewRequest(http.MethodPost, "/v1/policies", policyBody("bad", p)))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestUpdatePolicyWorksWhenWriteEnabled(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policyByID(w, httptest.NewRequest(http.MethodPut, "/v1/policies/campaign-shadow-v1", policyBody("campaign-shadow-v1", customPolicy("campaign-shadow-v1"))))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestUpdatePolicyIDMismatchReturns400(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policyByID(w, httptest.NewRequest(http.MethodPut, "/v1/policies/a", policyBody("b", customPolicy("b"))))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestAssignPolicyBlockedWhenWriteDisabled(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policyAssignment(w, httptest.NewRequest(http.MethodPost, "/v1/agents/local-dev-agent/policy-assignment", bytes.NewBufferString(`{"policy_id":"default"}`)), "local-dev-agent")
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestAssignPolicyWorksWhenWriteEnabledAndAgentPolicyReturnsAssigned(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policies(w, httptest.NewRequest(http.MethodPost, "/v1/policies", policyBody("campaign-shadow-v1", customPolicy("campaign-shadow-v1"))))
	if w.Code != http.StatusOK {
		t.Fatalf("create expected 200 got %d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	s.policyAssignment(w, httptest.NewRequest(http.MethodPost, "/v1/agents/local-dev-agent/policy-assignment", bytes.NewBufferString(`{"policy_id":"campaign-shadow-v1"}`)), "local-dev-agent")
	if w.Code != http.StatusOK {
		t.Fatalf("assign expected 200 got %d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("policy expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("campaign-shadow-v1")) {
		t.Fatalf("expected assigned policy body=%s", w.Body.String())
	}
}

func TestAssignNonExistentPolicyReturns404(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policyAssignment(w, httptest.NewRequest(http.MethodPost, "/v1/agents/local-dev-agent/policy-assignment", bytes.NewBufferString(`{"policy_id":"missing"}`)), "local-dev-agent")
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestGetAssignmentReturnsFalseByDefault(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.policyAssignment(w, httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy-assignment", nil), "local-dev-agent")
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"assigned":false`)) {
		t.Fatalf("expected assigned false got %d body=%s", w.Code, w.Body.String())
	}
}

func TestDeleteAssignmentWorks(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.policyAssignment(w, httptest.NewRequest(http.MethodDelete, "/v1/agents/local-dev-agent/policy-assignment", nil), "local-dev-agent")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestManagementWriteRequiresBearerTokenWhenConfigured(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	w := httptest.NewRecorder()
	s.configDraft(w, httptest.NewRequest(http.MethodPost, "/v1/agents/a/config/draft", bytes.NewBufferString(`{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}`)), "a")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token got %d body=%s", w.Code, w.Body.String())
	}
}

func TestManagementWriteValidBearerTokenSucceeds(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	req := httptest.NewRequest(http.MethodPost, "/v1/agents/a/config/draft", bytes.NewBufferString(`{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}`))
	req.Header.Set("Authorization", "Bearer test-management-token")
	w := httptest.NewRecorder()
	s.configDraft(w, req, "a")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 with token got %d body=%s", w.Code, w.Body.String())
	}
	if bytes.Contains(w.Body.Bytes(), []byte("test-management-token")) {
		t.Fatalf("token leaked in response: %s", w.Body.String())
	}
}

func TestManagementWriteInvalidBearerTokenRejected(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	cfg.Management.APIToken = "test-management-token"
	s := newTestServerWithConfig(t, cfg)

	req := httptest.NewRequest(http.MethodPost, "/v1/agents/a/config/publish", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	w := httptest.NewRecorder()
	s.configPublish(w, req, "a")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with wrong token got %d body=%s", w.Code, w.Body.String())
	}
}
