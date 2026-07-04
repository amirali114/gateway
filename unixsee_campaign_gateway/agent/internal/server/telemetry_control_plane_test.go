package server

import (
	"testing"

	"unixsee-campaign-gateway/agent/internal/policy"
)

func TestTelemetryPayloadIncludesControlPlaneMetadata(t *testing.T) {
	srv := newTestServer(t)
	p := policy.DefaultLocalProfile()
	p.ControlPlane = map[string]any{"config_version": float64(7), "config_hash": "abc123", "source": "mother"}
	srv.policyMu.Lock()
	srv.policyProfile = p
	srv.cfg.Policy = p
	srv.policyMu.Unlock()
	payload := srv.telemetryPayload()
	cp, ok := payload["control_plane"].(map[string]any)
	if !ok || cp["config_hash"] != "abc123" {
		t.Fatalf("missing control_plane metadata: %#v", payload["control_plane"])
	}
}
