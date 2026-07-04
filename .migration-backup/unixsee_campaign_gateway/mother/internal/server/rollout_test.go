package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"unixsee-campaign-gateway/mother/internal/config"
)

func postJSON(s *Server, method, path, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	s.httpSrv.Handler.ServeHTTP(w, req)
	return w
}

func TestR97PublishVersionDiffRollbackDeliveryAck(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	agentID := "rollout-agent"
	w := postJSON(s, http.MethodPost, "/v1/agents/"+agentID+"/config/draft", `{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}`)
	if w.Code != http.StatusOK {
		t.Fatalf("draft: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodGet, "/v1/agents/"+agentID+"/config/diff", "")
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte("dirty")) {
		t.Fatalf("diff: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodPost, "/v1/agents/"+agentID+"/config/publish", `{"note":"first publish"}`)
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"status":"published"`)) || !bytes.Contains(w.Body.Bytes(), []byte(`"config_hash"`)) {
		t.Fatalf("publish: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodGet, "/v1/agents/"+agentID+"/policy", "")
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"config_version":1`)) || !bytes.Contains(w.Body.Bytes(), []byte(`"config_hash"`)) {
		t.Fatalf("policy pull: %d %s", w.Code, w.Body.String())
	}
	var pull map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &pull); err != nil {
		t.Fatal(err)
	}
	cp := pull["policy"].(map[string]any)["control_plane"].(map[string]any)
	w = postJSON(s, http.MethodPost, "/v1/agents/"+agentID+"/telemetry", `{"agent_id":"`+agentID+`","mode":"shadow","shadow":{"comparison":{"mismatched":0,"match_rate":100}},"control_plane":{"config_version":1,"config_hash":"`+cp["config_hash"].(string)+`"}}`)
	if w.Code != http.StatusOK {
		t.Fatalf("telemetry ack: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodGet, "/v1/agents/"+agentID, "")
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"config_sync_status":"acknowledged"`)) {
		t.Fatalf("agent ack: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodPost, "/v1/agents/"+agentID+"/config/rollback", `{"target_version":1,"note":"test rollback"}`)
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"rollback_from_version":1`)) {
		t.Fatalf("rollback: %d %s", w.Code, w.Body.String())
	}
	w = postJSON(s, http.MethodGet, "/v1/agents/"+agentID+"/config/versions", "")
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(`"version":2`)) {
		t.Fatalf("versions: %d %s", w.Code, w.Body.String())
	}
}

func TestR97ValidationEndpointRejectsDangerousMode(t *testing.T) {
	cfg := config.Defaults()
	cfg.Management.WriteEnabled = true
	s := newTestServerWithConfig(t, cfg)
	w := postJSON(s, http.MethodPost, "/v1/agents/a/config/validate", `{"config":{"gateway":{"enabled":true,"mode":"enforce","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}}`)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}
