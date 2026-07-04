package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/security"
	"unixsee-campaign-gateway/mother/internal/storage"
)

func sampleTelemetry(agentID string) storage.TelemetryPayload {
	return storage.TelemetryPayload{
		AgentID:       agentID,
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Mode:          "shadow",
		UptimeSeconds: 123,
		Policy:        map[string]any{"source": "mother", "status": "fresh", "profile_id": "mother-default-shadow", "version": 1},
		Storage:       map[string]any{"engine": "jsonl", "ok": true},
		Shadow: storage.TelemetryShadowPayload{
			Received:        15,
			Stored:          15,
			InvalidJSON:     0,
			SignatureFailed: 0,
			Comparison:      map[string]any{"enabled": true, "compared": 15, "matched": 14, "mismatched": 1, "match_rate": 93.3},
			ByAction:        map[string]any{"allow": 1, "pass": 14, "wait": 0, "queue": 0, "block": 0, "unknown": 0},
		},
		Runtime: storage.TelemetryRuntime{GatewayEnabled: true, CampaignEnabled: true, QueueEnabled: false, BotEnabled: false, StorageFailMode: "open"},
	}
}

func postTelemetryRequest(t *testing.T, path string, payload storage.TelemetryPayload) *http.Request {
	t.Helper()
	b, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func TestTelemetryEndpointStoresLatestAndRegistry(t *testing.T) {
	s := newTestServer(t)
	path := "/v1/agents/iran-staging-agent/telemetry"
	w := httptest.NewRecorder()
	s.agentRoutes(w, postTelemetryRequest(t, path, sampleTelemetry("iran-staging-agent")))
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, path, nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected get 200 got %d body=%s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/iran-staging-agent", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected agent 200 got %d", w.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	agent := body["agent"].(map[string]any)
	if agent["telemetry_status"] != "fresh" {
		t.Fatalf("expected fresh telemetry status, got %+v", agent)
	}
	if got := agent["last_received"].(float64); got != 15 {
		t.Fatalf("expected received 15 got %v", got)
	}
}

func TestTelemetryRejectsInvalidSignatureWhenRequired(t *testing.T) {
	cfg := config.Defaults()
	cfg.Security.RequireSignature = true
	cfg.Security.AgentSharedSecret = "secret"
	s := newTestServerWithConfig(t, cfg)
	path := "/v1/agents/iran-staging-agent/telemetry"
	req := postTelemetryRequest(t, path, sampleTelemetry("iran-staging-agent"))
	req.Header.Set("X-Unixsee-Agent-ID", "iran-staging-agent")
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestTelemetrySignedRequestPassesWhenRequired(t *testing.T) {
	cfg := config.Defaults()
	cfg.Security.RequireSignature = true
	cfg.Security.AgentSharedSecret = "secret"
	s := newTestServerWithConfig(t, cfg)
	path := "/v1/agents/iran-staging-agent/telemetry"
	req := postTelemetryRequest(t, path, sampleTelemetry("iran-staging-agent"))
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req.Header.Set("X-Unixsee-Agent-ID", "iran-staging-agent")
	req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
	req.Header.Set("X-Unixsee-Agent-Signature", security.Sign("secret", security.CanonicalString(http.MethodPost, path, ts)))
	w := httptest.NewRecorder()
	s.agentRoutes(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestDiagnosticsSummaryAggregatesTelemetry(t *testing.T) {
	s := newTestServer(t)
	for _, id := range []string{"a1", "a2"} {
		path := fmt.Sprintf("/v1/agents/%s/telemetry", id)
		w := httptest.NewRecorder()
		s.agentRoutes(w, postTelemetryRequest(t, path, sampleTelemetry(id)))
		if w.Code != http.StatusOK {
			t.Fatalf("telemetry %s: %d", id, w.Code)
		}
	}
	w := httptest.NewRecorder()
	s.diagnosticsSummary(w, httptest.NewRequest(http.MethodGet, "/v1/diagnostics/summary", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("summary 200 got %d body=%s", w.Code, w.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	summary := body["summary"].(map[string]any)
	if summary["total_agents"].(float64) != 2 || summary["total_received"].(float64) != 30 {
		t.Fatalf("unexpected summary: %+v", summary)
	}
}

func TestEventBufferMaxSizeEnforced(t *testing.T) {
	s := newTestServer(t)
	path := "/v1/agents/agent-events/telemetry"
	for i := 0; i < 120; i++ {
		w := httptest.NewRecorder()
		s.agentRoutes(w, postTelemetryRequest(t, path, sampleTelemetry("agent-events")))
		if w.Code != http.StatusOK {
			t.Fatalf("telemetry %d: %d", i, w.Code)
		}
	}
	w := httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/agent-events/events", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("events 200 got %d", w.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	if got := len(body["events"].([]any)); got != 100 {
		t.Fatalf("expected 100 events got %d", got)
	}
}

func TestPolicyPullRecordsEvent(t *testing.T) {
	s := newTestServer(t)
	w := httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/event-agent/policy", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("policy pull got %d", w.Code)
	}
	w = httptest.NewRecorder()
	s.agentRoutes(w, httptest.NewRequest(http.MethodGet, "/v1/agents/event-agent/events", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("events got %d", w.Code)
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("policy_pull")) {
		t.Fatalf("expected policy_pull event, body=%s", w.Body.String())
	}
}
