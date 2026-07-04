package policy

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

func TestResolveMotherFetchesValidPolicy(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/local-dev-agent/policy" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "policy": DefaultMotherTestPolicy()})
	}))
	defer srv.Close()

	configured := DefaultLocalProfile()
	configured.Source = SourceMother
	eff, err := Resolve(context.Background(), configured, MotherOptions{Enabled: true, BaseURL: srv.URL, AgentID: "local-dev-agent", Timeout: time.Second, UseLastKnownGood: true, PolicyCachePath: filepath.Join(t.TempDir(), "last-known-policy.json")})
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if eff.Status != StatusFresh || eff.Profile.Source != SourceMother || eff.Profile.ProfileID != "mother-default-shadow" {
		t.Fatalf("unexpected effective policy: %+v", eff)
	}
}

func TestResolveMotherUnavailableFallsBackDefault(t *testing.T) {
	configured := DefaultLocalProfile()
	configured.Source = SourceMother
	eff, err := Resolve(context.Background(), configured, MotherOptions{Enabled: true, BaseURL: "http://127.0.0.1:1", AgentID: "local-dev-agent", Timeout: 50 * time.Millisecond, UseLastKnownGood: false, PolicyCachePath: filepath.Join(t.TempDir(), "last-known-policy.json")})
	if err != nil {
		t.Fatalf("resolve should not fail: %v", err)
	}
	if eff.Status != StatusFallbackDefault || eff.Profile.Source != SourceLocal {
		t.Fatalf("expected fallback default, got %+v", eff)
	}
}

func TestResolveInvalidMotherPolicyFallsBackDefault(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := DefaultMotherTestPolicy()
		p.Routes.ProductAction = "deny"
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "policy": p})
	}))
	defer srv.Close()
	configured := DefaultLocalProfile()
	configured.Source = SourceMother
	eff, err := Resolve(context.Background(), configured, MotherOptions{Enabled: true, BaseURL: srv.URL, AgentID: "local-dev-agent", Timeout: time.Second, UseLastKnownGood: false, PolicyCachePath: filepath.Join(t.TempDir(), "last-known-policy.json")})
	if err != nil {
		t.Fatalf("resolve should not fail: %v", err)
	}
	if eff.Status != StatusInvalidFallback || eff.Profile.Source != SourceLocal {
		t.Fatalf("expected invalid fallback, got %+v", eff)
	}
}

func TestResolveMotherUnavailableUsesLastKnownGood(t *testing.T) {
	cachePath := filepath.Join(t.TempDir(), "last-known-policy.json")
	cached := DefaultMotherTestPolicy()
	cached.ProfileID = "cached-mother-policy"
	if err := SaveLastKnownGood(cachePath, cached); err != nil {
		t.Fatalf("save cache: %v", err)
	}
	configured := DefaultLocalProfile()
	configured.Source = SourceMother
	eff, err := Resolve(context.Background(), configured, MotherOptions{Enabled: true, BaseURL: "http://127.0.0.1:1", AgentID: "local-dev-agent", Timeout: 50 * time.Millisecond, UseLastKnownGood: true, PolicyCachePath: cachePath})
	if err != nil {
		t.Fatalf("resolve should not fail: %v", err)
	}
	if eff.Status != StatusLastKnownGood || eff.Profile.ProfileID != "cached-mother-policy" {
		t.Fatalf("expected last known good, got %+v", eff)
	}
}

func DefaultMotherTestPolicy() Profile {
	p := DefaultLocalProfile()
	p.Source = SourceMother
	p.ProfileID = "mother-default-shadow"
	return p
}

func TestCanonicalPolicyRequest(t *testing.T) {
	got := CanonicalPolicyRequest("GET", "/v1/agents/local-dev-agent/policy", "1710000000")
	want := "GET\n/v1/agents/local-dev-agent/policy\n1710000000"
	if got != want {
		t.Fatalf("canonical mismatch: %q", got)
	}
}

func TestSanitizeBaseURLStripsCredentials(t *testing.T) {
	got := SanitizeBaseURL("http://user:pass@127.0.0.1:8732")
	if got != "http://127.0.0.1:8732" {
		t.Fatalf("expected credentials stripped, got %q", got)
	}
}

func TestSanitizeErrorRedactsSecret(t *testing.T) {
	got := SanitizeError("connect failed with s3cr3t token", "s3cr3t")
	if got != "connect failed with [redacted] token" {
		t.Fatalf("secret not redacted: %q", got)
	}
}
