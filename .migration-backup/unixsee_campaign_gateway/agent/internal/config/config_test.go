package config

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"unixsee-campaign-gateway/agent/internal/policy"
)

func TestDefaultConfigIsLocalOnly(t *testing.T) {
	cfg := Defaults()
	if cfg.Agent.ListenAddr != "127.0.0.1:8731" {
		t.Fatalf("unexpected default listen addr: %s", cfg.Agent.ListenAddr)
	}
	if cfg.Storage.Engine != "jsonl" {
		t.Fatalf("unexpected default storage engine: %s", cfg.Storage.Engine)
	}
	if !cfg.Decision.Enabled || cfg.Decision.Mode != "comparator" || cfg.Decision.DefaultAction != "allow" {
		t.Fatalf("unexpected default decision config: %+v", cfg.Decision)
	}
	if cfg.Policy.Source != policy.SourceLocal || cfg.Policy.ProfileID != "default-local-shadow" || cfg.Policy.Version != 1 {
		t.Fatalf("unexpected default policy identity: %+v", cfg.Policy.Identity())
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("default config should validate: %v", err)
	}
}

func TestRefuseRemoteBindByDefault(t *testing.T) {
	cfg := Defaults()
	cfg.Agent.ListenAddr = "0.0.0.0:8731"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected remote bind refusal")
	}
	cfg.Security.AllowRemoteBind = true
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected remote bind allowed with explicit flag: %v", err)
	}
}

func TestStorageEngineValidation(t *testing.T) {
	cfg := Defaults()
	cfg.Storage.Engine = "badger"
	if err := cfg.Validate(); err != nil {
		t.Fatalf("badger is a supported configured engine even if adapter may be unavailable: %v", err)
	}
	cfg.Storage.Engine = "fake"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected unsupported storage engine error")
	}
}

func TestDecisionConfigValidation(t *testing.T) {
	cfg := Defaults()
	cfg.Decision.Mode = "enforce"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected unsupported decision mode error")
	}
	cfg = Defaults()
	cfg.Decision.DefaultAction = "deny"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected unsupported default action error")
	}
}

func TestDiagnosticsConfigDefaultsAndValidation(t *testing.T) {
	cfg := Defaults()
	if !cfg.Diagnostics.Enabled || cfg.Diagnostics.RecentMismatchLimit != 100 || !cfg.Diagnostics.ExposeRecentMismatches || cfg.Diagnostics.IncludeIP || cfg.Diagnostics.IncludeUserAgent {
		t.Fatalf("unexpected default diagnostics config: %+v", cfg.Diagnostics)
	}
	cfg.Diagnostics.RecentMismatchLimit = -1
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected invalid diagnostics recent_mismatch_limit")
	}
}

func TestLoadNestedPolicyConfig(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "agent-*.yml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.WriteString(`agent:
  id: "test-agent"
  listen_addr: "127.0.0.1:8731"
  mode: "shadow"

policy:
  source: "local"
  profile_id: "test-profile"
  version: 2
  gateway:
    enabled: true
  campaign:
    enabled: true
    mode: "shadow"
    default_action: "allow"
  storage:
    fail_mode: "close"
  methods:
    managed:
      - "GET"
      - "POST"
  routes:
    product_action: "queue"
`)
	_ = file.Close()

	cfg, err := Load(file.Name())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Policy.ProfileID != "test-profile" || cfg.Policy.Version != 2 || cfg.Policy.Storage.FailMode != policy.FailModeClose {
		t.Fatalf("unexpected policy: %+v", cfg.Policy)
	}
	if len(cfg.Policy.Methods.Managed) != 2 || cfg.Policy.Methods.Managed[0] != "GET" || cfg.Policy.Methods.Managed[1] != "POST" {
		t.Fatalf("managed methods not parsed correctly: %+v", cfg.Policy.Methods.Managed)
	}
	if cfg.Policy.Routes.ProductAction != policy.ActionQueue {
		t.Fatalf("route action not parsed: %+v", cfg.Policy.Routes)
	}
}

func TestMotherPolicySourceDisabledFallsBackDefault(t *testing.T) {
	cfg := Defaults()
	cfg.Policy.Source = policy.SourceMother
	cfg.Mother.Enabled = false
	if err := cfg.ApplyDefaultsAndValidate(); err != nil {
		t.Fatalf("mother disabled should fall back safely: %v", err)
	}
	if cfg.PolicyStatus != policy.StatusFallbackDefault || cfg.Policy.Source != policy.SourceLocal {
		t.Fatalf("expected fallback default, got status=%s policy=%+v", cfg.PolicyStatus, cfg.Policy.Identity())
	}
}

func TestLoadMotherPolicyConfigFetchesValidPolicy(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := policy.DefaultLocalProfile()
		p.Source = policy.SourceMother
		p.ProfileID = "mother-default-shadow"
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "policy": p})
	}))
	defer srv.Close()

	file, err := os.CreateTemp(t.TempDir(), "agent-mother-*.yml")
	if err != nil {
		t.Fatal(err)
	}
	cachePath := filepath.Join(t.TempDir(), "last-known-policy.json")
	_, _ = file.WriteString(`agent:
  id: "local-dev-agent"
  listen_addr: "127.0.0.1:8731"
  mode: "shadow"
mother:
  enabled: true
  base_url: "` + srv.URL + `"
  agent_id: "local-dev-agent"
  shared_secret: ""
  require_signature: false
  policy_pull_timeout_ms: 500
  policy_refresh_seconds: 30
  use_last_known_good: true
  policy_cache_path: "` + cachePath + `"
policy:
  source: "mother"
`)
	_ = file.Close()

	cfg, err := Load(file.Name())
	if err != nil {
		t.Fatalf("load mother config: %v", err)
	}
	if cfg.PolicyStatus != policy.StatusFresh || cfg.Policy.Source != policy.SourceMother || cfg.Policy.ProfileID != "mother-default-shadow" {
		t.Fatalf("unexpected mother policy: status=%s policy=%+v", cfg.PolicyStatus, cfg.Policy.Identity())
	}
}

func TestLoadMotherUnavailableFallsBackDefault(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "agent-mother-down-*.yml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.WriteString(`mother:
  enabled: true
  base_url: "http://127.0.0.1:1"
  agent_id: "local-dev-agent"
  policy_pull_timeout_ms: 50
  policy_cache_path: "` + filepath.Join(t.TempDir(), "last-known-policy.json") + `"
policy:
  source: "mother"
`)
	_ = file.Close()
	cfg, err := Load(file.Name())
	if err != nil {
		t.Fatalf("load should fall back safely: %v", err)
	}
	if cfg.PolicyStatus != policy.StatusFallbackDefault || cfg.Policy.Source != policy.SourceLocal {
		t.Fatalf("expected fallback_default, got status=%s policy=%+v", cfg.PolicyStatus, cfg.Policy.Identity())
	}
}

func writeTempAgentConfig(t *testing.T, body string) string {
	t.Helper()
	file, err := os.CreateTemp(t.TempDir(), "agent-inline-list-*.yml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.WriteString(body)
	_ = file.Close()
	return file.Name()
}

func TestLoadPolicyManagedMethodsBlockListStillWorks(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed:
      - "GET"
      - "HEAD"
      - "POST"
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load block list config: %v", err)
	}
	got := cfg.Policy.Methods.Managed
	want := []string{"GET", "HEAD", "POST"}
	if len(got) != len(want) {
		t.Fatalf("managed methods length mismatch: got=%v want=%v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("managed methods mismatch: got=%v want=%v", got, want)
		}
	}
}

func TestLoadPolicyManagedMethodsInlineDoubleQuotedList(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: ["GET", "HEAD", "POST"]
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load inline double quoted list config: %v", err)
	}
	got := cfg.Policy.Methods.Managed
	if len(got) != 3 || got[0] != "GET" || got[1] != "HEAD" || got[2] != "POST" {
		t.Fatalf("managed methods not parsed from inline double quoted list: %+v", got)
	}
}

func TestLoadPolicyManagedMethodsInlineSingleQuotedList(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: ['GET', 'HEAD', 'POST']
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load inline single quoted list config: %v", err)
	}
	got := cfg.Policy.Methods.Managed
	if len(got) != 3 || got[0] != "GET" || got[1] != "HEAD" || got[2] != "POST" {
		t.Fatalf("managed methods not parsed from inline single quoted list: %+v", got)
	}
}

func TestLoadPolicyManagedMethodsInlineUnquotedList(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: [GET, HEAD, POST]
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load inline unquoted list config: %v", err)
	}
	got := cfg.Policy.Methods.Managed
	if len(got) != 3 || got[0] != "GET" || got[1] != "HEAD" || got[2] != "POST" {
		t.Fatalf("managed methods not parsed from inline unquoted list: %+v", got)
	}
}

func TestLoadPolicyManagedMethodsEmptyInlineListUsesExistingDefaultBehavior(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: []
`)
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("empty inline list should follow existing defaulting behavior: %v", err)
	}
	got := cfg.Policy.Methods.Managed
	if len(got) != 3 || got[0] != "GET" || got[1] != "HEAD" || got[2] != "POST" {
		t.Fatalf("empty inline list should default to safe managed methods, got: %+v", got)
	}
}

func TestLoadPolicyManagedMethodsMalformedInlineListFailsClearly(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: ["GET", "POST"
`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected malformed inline list error")
	}
	if !strings.Contains(err.Error(), "malformed inline list") {
		t.Fatalf("expected clear malformed inline list error, got: %v", err)
	}
}

func TestLoadPolicyManagedMethodsScalarFailsClearly(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    managed: "GET"
`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected scalar managed methods error")
	}
	if !strings.Contains(err.Error(), "policy.methods.managed must be a list") {
		t.Fatalf("expected managed methods list error, got: %v", err)
	}
}

func TestLoadUnknownConfigKeyStillFails(t *testing.T) {
	path := writeTempAgentConfig(t, `policy:
  methods:
    unexpected: [GET]
`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected unknown config key error")
	}
	if !strings.Contains(err.Error(), "unknown config key") {
		t.Fatalf("expected unknown config key error, got: %v", err)
	}
}

func TestSecretFilesResolveWithoutLeakingValues(t *testing.T) {
	dir := t.TempDir()
	shadowSecret := filepath.Join(dir, "agent-shadow.secret")
	motherSecret := filepath.Join(dir, "mother-agent.secret")
	if err := os.WriteFile(shadowSecret, []byte("shadow-file-secret\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(motherSecret, []byte("mother-file-secret\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(dir, "agent.yml")
	if err := os.WriteFile(cfgPath, []byte(`security:
  shadow_secret_file: "`+shadowSecret+`"
mother:
  enabled: false
  shared_secret_file: "`+motherSecret+`"
`), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(cfgPath)
	if err != nil {
		t.Fatalf("load config with secret files: %v", err)
	}
	if cfg.Security.ShadowSecret != "shadow-file-secret" || cfg.Mother.SharedSecret != "mother-file-secret" {
		t.Fatalf("secret files not resolved")
	}
	summary := fmt.Sprint(cfg.SafeSummary())
	if strings.Contains(summary, "shadow-file-secret") || strings.Contains(summary, "mother-file-secret") {
		t.Fatalf("safe summary leaked resolved secret value: %s", summary)
	}
}
