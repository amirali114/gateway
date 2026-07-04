package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/logger"
	"unixsee-campaign-gateway/mother/internal/security"
	"unixsee-campaign-gateway/mother/internal/storage"
)

func newTestServer(t *testing.T) *Server {
	t.Helper()
	cfg := config.Defaults()
	return newTestServerWithConfig(t, cfg)
}

func newTestServerWithConfig(t *testing.T, cfg config.Config) *Server {
	t.Helper()
	cfg.Logging.Path = filepath.Join(t.TempDir(), "mother.log")
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
	return New(cfg, log, store)
}

func signedPolicyRequest(path string, agentID string, secret string, ts string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("X-Unixsee-Agent-ID", agentID)
	req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
	req.Header.Set("X-Unixsee-Agent-Signature", security.Sign(secret, security.CanonicalString(http.MethodGet, path, ts)))
	return req
}

func TestHealthEndpoint(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.healthz(w, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", w.Code)
	}
}

func TestReadyzEndpoint(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.readyz(w, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", w.Code)
	}
}

func TestPolicyEndpointReturnsValidPolicy(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json: %v", err)
	}
	p := payload["policy"].(map[string]any)
	if p["source"] != "mother" || p["profile_id"] != "mother-default-shadow" {
		t.Fatalf("unexpected policy: %+v", payload)
	}
}

func TestWrongMethodReturns405(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodPost, "/v1/agents/local-dev-agent/policy", nil))
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 got %d", w.Code)
	}
}

func TestUnknownRouteReturns404(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.notFound(w, httptest.NewRequest(http.MethodGet, "/missing", nil))
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 got %d", w.Code)
	}
}

func TestDebugEndpointDisabledByDefaultAtDebugRoute(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.defaultPolicy(w, httptest.NewRequest(http.MethodGet, "/v1/debug/policies/default", nil))
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected debug endpoint disabled as 404, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestDebugEndpointWorksWhenEnabledAtDebugRoute(t *testing.T) {
	cfg := config.Defaults()
	cfg.Debug.Enabled = true
	s := newTestServerWithConfig(t, cfg)
	w := httptest.NewRecorder()
	s.defaultPolicy(w, httptest.NewRequest(http.MethodGet, "/v1/debug/policies/default", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestHMACValidRequestPassesWhenRequired(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	path := "/v1/agents/local-dev-agent/policy"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req := signedPolicyRequest(path, "local-dev-agent", "secret", ts)
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestHMACMissingRequestFailsWhenRequired(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	w := httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", w.Code)
	}
}

func TestMissingAgentIDHeaderFailsWhenSignatureRequired(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	path := "/v1/agents/local-dev-agent/policy"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
	req.Header.Set("X-Unixsee-Agent-Signature", security.Sign("secret", security.CanonicalString(http.MethodGet, path, ts)))
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestMismatchedAgentIDHeaderFails(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	path := "/v1/agents/local-dev-agent/policy"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req := signedPolicyRequest(path, "other-agent", "secret", ts)
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestHeaderAgentIDMismatchFailsEvenWithoutSignatureRequired(t *testing.T) {
	s := newTestServer(t)
	req := httptest.NewRequest(http.MethodGet, "/v1/agents/local-dev-agent/policy", nil)
	req.Header.Set("X-Unixsee-Agent-ID", "other-agent")
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestOldTimestampFailsWhenRequired(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	path := "/v1/agents/local-dev-agent/policy"
	ts := strconv.FormatInt(time.Now().Add(-10*time.Minute).Unix(), 10)
	req := signedPolicyRequest(path, "local-dev-agent", "secret", ts)
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestFutureTimestampFailsWhenRequired(t *testing.T) {
	s := newTestServer(t)
	s.cfg.Security.RequireSignature = true
	s.cfg.Security.AgentSharedSecret = "secret"
	path := "/v1/agents/local-dev-agent/policy"
	ts := strconv.FormatInt(time.Now().Add(10*time.Minute).Unix(), 10)
	req := signedPolicyRequest(path, "local-dev-agent", "secret", ts)
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestStorageStatusEndpoint(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.storageStatus(w, httptest.NewRequest(http.MethodGet, "/v1/storage/status", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json: %v", err)
	}
	if payload["engine"] == "" || payload["persisted_objects"] == nil {
		t.Fatalf("unexpected storage status: %+v", payload)
	}
}
