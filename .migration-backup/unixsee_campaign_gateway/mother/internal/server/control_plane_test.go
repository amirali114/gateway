package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"unixsee-campaign-gateway/mother/internal/config"
)

func validControlConfigJSON() *bytes.Reader {
	return bytes.NewReader([]byte(`{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}`))
}

func TestAgentRegistryUpdatesOnPolicyPullAndListAgents(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent/policy", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("policy pull expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/agents", nil))
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte("iran-staging-agent")) {
		t.Fatalf("agents expected iran-staging-agent got %d body=%s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte(`"pull_count":1`)) {
		t.Fatalf("expected pull_count body=%s", w.Body.String())
	}
}

func TestGetAgentDetail(t *testing.T) {
	s := newTestServer(t)
	s.httpSrv.Handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent/policy", nil))
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent", nil))
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte("policy_assignment")) {
		t.Fatalf("detail failed %d body=%s", w.Code, w.Body.String())
	}
}

func TestConfigDraftPublishAndHistory(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/draft", validControlConfigJSON()))
	if w.Code != http.StatusOK {
		t.Fatalf("draft expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/publish", nil))
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"status":"published"`)) {
		t.Fatalf("publish failed %d body=%s", w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent/config/history", nil))
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"version":1`)) {
		t.Fatalf("history failed %d body=%s", w.Code, w.Body.String())
	}
}

func TestConfigDraftValidationRejectsDangerousMode(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	bad := bytes.NewReader([]byte(`{"gateway":{"enabled":true,"mode":"enforce","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}`))
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/draft", bad))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestPolicyPullIncludesControlPlaneMetadata(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	s.httpSrv.Handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/draft", validControlConfigJSON()))
	s.httpSrv.Handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/publish", nil))
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent/policy", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("policy expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	p := out["policy"].(map[string]any)
	cp, ok := p["control_plane"].(map[string]any)
	if !ok || cp["agent_id"] != "iran-staging-agent" {
		t.Fatalf("missing control_plane: %+v", out)
	}
}

func TestActorHeadersStoredOnConfigVersion(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	req := httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/draft", validControlConfigJSON())
	req.Header.Set("X-Unixsee-Actor-Username", "ops-user")
	req.Header.Set("X-Unixsee-Actor-Role", "admin")
	w := httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("draft expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/v1/agents/iran-staging-agent/config/publish", nil)
	req.Header.Set("X-Unixsee-Actor-Username", "ops-user")
	req.Header.Set("X-Unixsee-Actor-Role", "admin")
	w = httptest.NewRecorder()
	s.httpSrv.Handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"published_by":"ops-user:admin"`)) {
		t.Fatalf("expected actor metadata in version response got %d body=%s", w.Code, w.Body.String())
	}
}
