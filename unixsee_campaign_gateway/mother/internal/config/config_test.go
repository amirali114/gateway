package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDefaultsValidate(t *testing.T) {
	cfg := Defaults()
	if cfg.Mother.ListenAddr != "127.0.0.1:8732" || cfg.Storage.Engine != "memory" || cfg.Debug.Enabled || !cfg.Management.Enabled || cfg.Management.WriteEnabled || cfg.Security.SignatureMaxSkewSeconds != 300 {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("defaults should validate: %v", err)
	}
}

func TestPublicBindBlockedUnlessAllowed(t *testing.T) {
	cfg := Defaults()
	cfg.Mother.ListenAddr = "0.0.0.0:8732"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected public bind block")
	}
	cfg.Security.AllowRemoteBind = true
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected public bind allowed with flag: %v", err)
	}
}

func TestPostgresEngineRequiresDSNAndParsesNestedConfig(t *testing.T) {
	cfg := Defaults()
	cfg.Storage.Engine = "postgres"
	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "storage.engine=postgres requires") {
		t.Fatalf("expected postgres dsn error, got %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "mother-postgres.yml")
	if err := os.WriteFile(path, []byte(`storage:
  engine: "postgres"
  path: "/var/lib/unixsee-gateway/mother"
  sync_writes: true
  backup_on_migration: true
  postgres:
    dsn: "postgres://uxgw:secret@example.internal:5432/uxgw?sslmode=require"
    max_open_conns: 12
    max_idle_conns: 4
    conn_max_lifetime_seconds: 200
    sslmode: "require"
`), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err = Load(path)
	if err != nil {
		t.Fatalf("postgres profile should parse and validate config surface: %v", err)
	}
	if cfg.Storage.Engine != "postgres" || cfg.Storage.Postgres.MaxOpenConns != 12 || cfg.Storage.Postgres.MaxIdleConns != 4 {
		t.Fatalf("postgres config not parsed: %+v", cfg.Storage)
	}
	if strings.Contains(fmt.Sprint(cfg.SafeSummary()), "secret") {
		t.Fatalf("safe summary leaked postgres password: %#v", cfg.SafeSummary())
	}
}

func TestLoadConfig(t *testing.T) {
	f, err := os.CreateTemp(t.TempDir(), "mother-*.yml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = f.WriteString(`mother:
  listen_addr: "127.0.0.1:8732"
  mode: "dev"
security:
  agent_shared_secret: "test-secret"
  require_signature: true
  allow_remote_bind: false
  signature_max_skew_seconds: 120
debug:
  enabled: true
management:
  enabled: true
  write_enabled: true
storage:
  engine: "json"
  path: "./data/mother"
  sync_writes: true
  backup_on_migration: true
logging:
  level: "info"
  path: "./logs/test.log"
`)
	_ = f.Close()
	cfg, err := Load(f.Name())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.Security.RequireSignature || cfg.Security.AgentSharedSecret != "test-secret" || cfg.Security.SignatureMaxSkewSeconds != 120 {
		t.Fatalf("security config not parsed: %+v", cfg.Security)
	}
	if !cfg.Debug.Enabled {
		t.Fatalf("debug config not parsed: %+v", cfg.Debug)
	}
	if !cfg.Management.Enabled || !cfg.Management.WriteEnabled {
		t.Fatalf("management config not parsed: %+v", cfg.Management)
	}
	if cfg.Storage.Engine != "json" || !cfg.Storage.SyncWrites || !cfg.Storage.BackupOnMigration {
		t.Fatalf("storage config not parsed: %+v", cfg.Storage)
	}
}

func TestSignatureSkewValidation(t *testing.T) {
	cfg := Defaults()
	cfg.Security.SignatureMaxSkewSeconds = 10
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected too-small signature skew to fail")
	}
	cfg.Security.SignatureMaxSkewSeconds = 4000
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected too-large signature skew to fail")
	}
	cfg.Security.SignatureMaxSkewSeconds = 300
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid skew: %v", err)
	}
}

func TestManagementAPITokenParsesButIsNotInSafeSummary(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "mother.yml")
	if err := os.WriteFile(path, []byte("management:\n  enabled: true\n  write_enabled: true\n  api_token: secret-token-value\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.Management.APIToken != "secret-token-value" {
		t.Fatalf("api token not parsed")
	}
	summary := cfg.SafeSummary()
	if summary["management_token_configured"] != true {
		t.Fatalf("expected token configured summary")
	}
	for _, v := range summary {
		if v == "secret-token-value" {
			t.Fatalf("token leaked in safe summary")
		}
	}
}

func TestLoadSupportsServerListenAddrAlias(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "mother-server-alias.yml")
	if err := os.WriteFile(path, []byte(`server:
  listen_addr: "127.0.0.1:8732"
  mode: "dev"
management:
  enabled: true
  write_enabled: false
`), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if cfg.Mother.ListenAddr != "127.0.0.1:8732" {
		t.Fatalf("server.listen_addr alias not applied: %q", cfg.Mother.ListenAddr)
	}
}

func TestSecretFilesResolveWithoutLeakingValues(t *testing.T) {
	dir := t.TempDir()
	agentSecret := filepath.Join(dir, "mother-agent.secret")
	mgmtToken := filepath.Join(dir, "mother-management.token")
	if err := os.WriteFile(agentSecret, []byte("agent-file-secret\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(mgmtToken, []byte("management-file-token\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfgPath := filepath.Join(dir, "mother.yml")
	if err := os.WriteFile(cfgPath, []byte(fmt.Sprintf(`security:
  agent_shared_secret_file: %q
  require_signature: true
management:
  enabled: true
  write_enabled: true
  api_token_file: %q
storage:
  engine: "json"
  path: %q
`, agentSecret, mgmtToken, filepath.Join(dir, "state"))), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(cfgPath)
	if err != nil {
		t.Fatalf("load config with secret files: %v", err)
	}
	if cfg.Security.AgentSharedSecret != "agent-file-secret" || cfg.Management.APIToken != "management-file-token" {
		t.Fatalf("secret files not resolved")
	}
	summary := fmt.Sprint(cfg.SafeSummary())
	if strings.Contains(summary, "agent-file-secret") || strings.Contains(summary, "management-file-token") {
		t.Fatalf("safe summary leaked resolved secret value: %s", summary)
	}
}
