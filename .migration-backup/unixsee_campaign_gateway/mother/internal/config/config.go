package config

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"unixsee-campaign-gateway/mother/internal/storage"
)

type Config struct {
	Mother        MotherConfig        `yaml:"mother"`
	Security      SecurityConfig      `yaml:"security"`
	Debug         DebugConfig         `yaml:"debug"`
	Management    ManagementConfig    `yaml:"management"`
	Storage       StorageConfig       `yaml:"storage"`
	Alerts        AlertsConfig        `yaml:"alerts"`
	Notifications NotificationsConfig `yaml:"notifications"`
	Logging       LoggingConfig       `yaml:"logging"`
}

type MotherConfig struct {
	ListenAddr string `yaml:"listen_addr"`
	Mode       string `yaml:"mode"`
}

type SecurityConfig struct {
	AgentSharedSecret       string `yaml:"agent_shared_secret"`
	AgentSharedSecretFile   string `yaml:"agent_shared_secret_file"`
	RequireSignature        bool   `yaml:"require_signature"`
	AllowRemoteBind         bool   `yaml:"allow_remote_bind"`
	SignatureMaxSkewSeconds int    `yaml:"signature_max_skew_seconds"`
}

type DebugConfig struct {
	Enabled bool `yaml:"enabled"`
}

type ManagementConfig struct {
	Enabled      bool   `yaml:"enabled"`
	WriteEnabled bool   `yaml:"write_enabled"`
	APIToken     string `yaml:"api_token"`
	APITokenFile string `yaml:"api_token_file"`
}

type StorageConfig struct {
	Engine            string         `yaml:"engine"`
	Path              string         `yaml:"path"`
	SyncWrites        bool           `yaml:"sync_writes"`
	BackupOnMigration bool           `yaml:"backup_on_migration"`
	Postgres          PostgresConfig `yaml:"postgres"`
}

type PostgresConfig struct {
	DSN                    string `yaml:"dsn"`
	DSNFile                string `yaml:"dsn_file"`
	MaxOpenConns           int    `yaml:"max_open_conns"`
	MaxIdleConns           int    `yaml:"max_idle_conns"`
	ConnMaxLifetimeSeconds int    `yaml:"conn_max_lifetime_seconds"`
	SSLMode                string `yaml:"sslmode"`
}

type AlertsConfig struct {
	Enabled                   bool `yaml:"enabled"`
	EvaluationIntervalSeconds int  `yaml:"evaluation_interval_seconds"`
	StaleAfterSeconds         int  `yaml:"stale_after_seconds"`
	CriticalStaleAfterSeconds int  `yaml:"critical_stale_after_seconds"`
	MaxAlerts                 int  `yaml:"max_alerts"`
}

type NotificationsConfig struct {
	Enabled  bool     `yaml:"enabled"`
	Channels []string `yaml:"channels"`
}

type LoggingConfig struct {
	Level string `yaml:"level"`
	Path  string `yaml:"path"`
}

func Defaults() Config {
	return Config{
		Mother:        MotherConfig{ListenAddr: "127.0.0.1:8732", Mode: "dev"},
		Security:      SecurityConfig{AgentSharedSecret: "", RequireSignature: false, AllowRemoteBind: false, SignatureMaxSkewSeconds: 300},
		Debug:         DebugConfig{Enabled: false},
		Management:    ManagementConfig{Enabled: true, WriteEnabled: false},
		Storage:       StorageConfig{Engine: storage.EngineMemory, Path: "./data/mother", SyncWrites: false, BackupOnMigration: true, Postgres: PostgresConfig{MaxOpenConns: 10, MaxIdleConns: 5, ConnMaxLifetimeSeconds: 300, SSLMode: "require"}},
		Alerts:        AlertsConfig{Enabled: true, EvaluationIntervalSeconds: 60, StaleAfterSeconds: 90, CriticalStaleAfterSeconds: 300, MaxAlerts: 1000},
		Notifications: NotificationsConfig{Enabled: false, Channels: []string{}},
		Logging:       LoggingConfig{Level: "info", Path: "./logs/unixsee-mother.log"},
	}
}

func Load(path string) (Config, error) {
	cfg := Defaults()
	if strings.TrimSpace(path) == "" {
		return cfg, cfg.Validate()
	}
	f, err := os.Open(path)
	if err != nil {
		return cfg, fmt.Errorf("read config: %w", err)
	}
	defer f.Close()
	if err := parseSimpleYAML(bufio.NewScanner(f), &cfg); err != nil {
		return cfg, fmt.Errorf("parse config yaml: %w", err)
	}
	if strings.TrimSpace(cfg.Mother.ListenAddr) == "" {
		cfg.Mother.ListenAddr = Defaults().Mother.ListenAddr
	}
	if strings.TrimSpace(cfg.Mother.Mode) == "" {
		cfg.Mother.Mode = Defaults().Mother.Mode
	}
	if strings.TrimSpace(cfg.Storage.Engine) == "" {
		cfg.Storage.Engine = Defaults().Storage.Engine
	}
	cfg.Storage.Engine = strings.ToLower(strings.TrimSpace(cfg.Storage.Engine))
	if strings.TrimSpace(cfg.Storage.Path) == "" {
		cfg.Storage.Path = Defaults().Storage.Path
	}
	if strings.TrimSpace(cfg.Logging.Level) == "" {
		cfg.Logging.Level = Defaults().Logging.Level
	}
	if strings.TrimSpace(cfg.Logging.Path) == "" {
		cfg.Logging.Path = Defaults().Logging.Path
	}
	if err := cfg.ResolveSecrets(); err != nil {
		return cfg, err
	}
	return cfg, cfg.Validate()
}

func parseSimpleYAML(scanner *bufio.Scanner, cfg *Config) error {
	sections := map[int]string{}
	currentTop := ""
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := strings.TrimRight(scanner.Text(), " \t\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		indent := len(line) - len(strings.TrimLeft(line, " "))
		if strings.HasSuffix(trimmed, ":") {
			name := strings.TrimSuffix(trimmed, ":")
			if indent == 0 {
				currentTop = name
				sections = map[int]string{0: name}
			} else if currentTop != "" {
				sections[indent] = currentTop + "." + name
			}
			continue
		}
		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) != 2 {
			return fmt.Errorf("line %d: invalid key/value", lineNo)
		}
		section := currentTop
		for level, candidate := range sections {
			if level < indent && level >= 0 && candidate != "" {
				if section == "" || len(candidate) > len(section) {
					section = candidate
				}
			}
		}
		keyName := strings.TrimSpace(parts[0])
		key := keyName
		if section != "" {
			key = section + "." + keyName
		}
		value := parseScalar(strings.TrimSpace(parts[1]))
		if err := assign(key, value, cfg); err != nil {
			return fmt.Errorf("line %d: %w", lineNo, err)
		}
	}
	return scanner.Err()
}

func parseScalar(v string) string {
	if idx := strings.Index(v, " #"); idx >= 0 {
		v = strings.TrimSpace(v[:idx])
	}
	if len(v) >= 2 {
		if (v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'') {
			unq, err := strconv.Unquote(v)
			if err == nil {
				return unq
			}
			return strings.Trim(v, "\"'")
		}
	}
	return v
}

func assign(key string, value string, cfg *Config) error {
	switch key {
	case "mother.listen_addr", "server.listen_addr":
		cfg.Mother.ListenAddr = value
	case "mother.mode", "server.mode":
		cfg.Mother.Mode = value
	case "security.agent_shared_secret":
		cfg.Security.AgentSharedSecret = os.ExpandEnv(value)
	case "security.agent_shared_secret_file":
		cfg.Security.AgentSharedSecretFile = os.ExpandEnv(value)
	case "security.require_signature":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Security.RequireSignature = v
	case "security.allow_remote_bind":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Security.AllowRemoteBind = v
	case "security.signature_max_skew_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid signature_max_skew_seconds: %w", err)
		}
		cfg.Security.SignatureMaxSkewSeconds = v
	case "debug.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Debug.Enabled = v
	case "management.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Management.Enabled = v
	case "management.write_enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Management.WriteEnabled = v
	case "management.api_token":
		cfg.Management.APIToken = os.ExpandEnv(value)
	case "management.api_token_file":
		cfg.Management.APITokenFile = os.ExpandEnv(value)
	case "storage.engine":
		cfg.Storage.Engine = value
	case "storage.path":
		cfg.Storage.Path = value
	case "storage.sync_writes":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Storage.SyncWrites = v
	case "storage.backup_on_migration":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Storage.BackupOnMigration = v
	case "storage.postgres.dsn", "storage.postgres_dsn":
		cfg.Storage.Postgres.DSN = os.ExpandEnv(value)
	case "storage.postgres.dsn_file", "storage.postgres_dsn_file":
		cfg.Storage.Postgres.DSNFile = os.ExpandEnv(value)
	case "storage.postgres.max_open_conns", "storage.postgres_max_open_conns":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid postgres max_open_conns: %w", err)
		}
		cfg.Storage.Postgres.MaxOpenConns = v
	case "storage.postgres.max_idle_conns", "storage.postgres_max_idle_conns":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid postgres max_idle_conns: %w", err)
		}
		cfg.Storage.Postgres.MaxIdleConns = v
	case "storage.postgres.conn_max_lifetime_seconds", "storage.postgres_conn_max_lifetime_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid postgres conn_max_lifetime_seconds: %w", err)
		}
		cfg.Storage.Postgres.ConnMaxLifetimeSeconds = v
	case "storage.postgres.sslmode", "storage.postgres_sslmode":
		cfg.Storage.Postgres.SSLMode = value
	case "alerts.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Alerts.Enabled = v
	case "alerts.evaluation_interval_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid alerts.evaluation_interval_seconds: %w", err)
		}
		cfg.Alerts.EvaluationIntervalSeconds = v
	case "alerts.stale_after_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid alerts.stale_after_seconds: %w", err)
		}
		cfg.Alerts.StaleAfterSeconds = v
	case "alerts.critical_stale_after_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid alerts.critical_stale_after_seconds: %w", err)
		}
		cfg.Alerts.CriticalStaleAfterSeconds = v
	case "alerts.max_alerts":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid alerts.max_alerts: %w", err)
		}
		cfg.Alerts.MaxAlerts = v
	case "notifications.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Notifications.Enabled = v
	case "notifications.channels":
		cfg.Notifications.Channels = parseList(value)
	case "logging.level":
		cfg.Logging.Level = value
	case "logging.path":
		cfg.Logging.Path = value
	default:
		return fmt.Errorf("unknown config key %q", key)
	}
	return nil
}

func readSecretFile(label string, path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", nil
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read %s file: %w", label, err)
	}
	value := strings.TrimSpace(string(b))
	if value == "" {
		return "", fmt.Errorf("%s file is empty", label)
	}
	return value, nil
}

func (c *Config) ResolveSecrets() error {
	if strings.TrimSpace(c.Security.AgentSharedSecretFile) != "" {
		v, err := readSecretFile("security.agent_shared_secret", c.Security.AgentSharedSecretFile)
		if err != nil {
			return err
		}
		c.Security.AgentSharedSecret = v
	}
	if strings.TrimSpace(c.Management.APITokenFile) != "" {
		v, err := readSecretFile("management.api_token", c.Management.APITokenFile)
		if err != nil {
			return err
		}
		c.Management.APIToken = v
	}
	if strings.TrimSpace(c.Storage.Postgres.DSNFile) != "" {
		v, err := readSecretFile("storage.postgres.dsn", c.Storage.Postgres.DSNFile)
		if err != nil {
			return err
		}
		c.Storage.Postgres.DSN = v
	}
	return nil
}

func parseList(value string) []string {
	value = strings.TrimSpace(value)
	value = strings.Trim(value, "[]")
	if value == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	out := []string{}
	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), "\"'")
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

func parseBool(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "true", "yes", "1", "on":
		return true, nil
	case "false", "no", "0", "off":
		return false, nil
	default:
		return false, fmt.Errorf("invalid bool %q", value)
	}
}

func (c Config) Validate() error {
	if c.Mother.Mode != "dev" {
		return fmt.Errorf("unsupported mother mode %q: R7 supports dev only", c.Mother.Mode)
	}
	if err := validateListenAddr(c.Mother.ListenAddr, c.Security.AllowRemoteBind); err != nil {
		return err
	}
	if c.Security.SignatureMaxSkewSeconds == 0 {
		c.Security.SignatureMaxSkewSeconds = 300
	}
	if c.Security.SignatureMaxSkewSeconds < 30 || c.Security.SignatureMaxSkewSeconds > 3600 {
		return fmt.Errorf("security.signature_max_skew_seconds must be between 30 and 3600")
	}
	if c.Security.RequireSignature && strings.TrimSpace(c.Security.AgentSharedSecret) == "" {
		return fmt.Errorf("security.require_signature=true requires security.agent_shared_secret")
	}
	if c.Storage.Engine != storage.EngineMemory && c.Storage.Engine != storage.EngineJSON && c.Storage.Engine != storage.EnginePostgres {
		return fmt.Errorf("unsupported mother storage engine %q", c.Storage.Engine)
	}
	if c.Alerts.EvaluationIntervalSeconds <= 0 {
		c.Alerts.EvaluationIntervalSeconds = 60
	}
	if c.Alerts.StaleAfterSeconds <= 0 {
		c.Alerts.StaleAfterSeconds = 90
	}
	if c.Alerts.CriticalStaleAfterSeconds <= 0 {
		c.Alerts.CriticalStaleAfterSeconds = 300
	}
	if c.Alerts.MaxAlerts <= 0 {
		c.Alerts.MaxAlerts = 1000
	}
	if c.Alerts.CriticalStaleAfterSeconds < c.Alerts.StaleAfterSeconds {
		return fmt.Errorf("alerts.critical_stale_after_seconds must be >= alerts.stale_after_seconds")
	}
	if c.Storage.Engine == storage.EnginePostgres {
		if strings.TrimSpace(c.Storage.Postgres.DSN) == "" {
			return fmt.Errorf("storage.engine=postgres requires storage.postgres.dsn or UNIXSEE_MOTHER_POSTGRES_DSN")
		}
		if c.Storage.Postgres.MaxOpenConns <= 0 {
			c.Storage.Postgres.MaxOpenConns = 10
		}
		if c.Storage.Postgres.MaxIdleConns <= 0 {
			c.Storage.Postgres.MaxIdleConns = 5
		}
		if c.Storage.Postgres.ConnMaxLifetimeSeconds <= 0 {
			c.Storage.Postgres.ConnMaxLifetimeSeconds = 300
		}
		if strings.TrimSpace(c.Storage.Postgres.SSLMode) == "" {
			c.Storage.Postgres.SSLMode = "require"
		}
	}
	return nil
}

func validateListenAddr(addr string, allowRemote bool) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("invalid listen_addr %q: %w", addr, err)
	}
	if host == "" {
		return errors.New("listen_addr host is empty; use 127.0.0.1:8732 unless remote bind is explicitly allowed")
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return fmt.Errorf("listen_addr host %q must be an IP address", host)
	}
	if !allowRemote && !ip.IsLoopback() {
		return fmt.Errorf("refusing remote bind %q: set security.allow_remote_bind=true only for controlled deployments", addr)
	}
	return nil
}

func (c Config) SafeSummary() map[string]any {
	return map[string]any{
		"listen_addr":                          c.Mother.ListenAddr,
		"mode":                                 c.Mother.Mode,
		"require_signature":                    c.Security.RequireSignature,
		"allow_remote_bind":                    c.Security.AllowRemoteBind,
		"signature_max_skew_seconds":           c.Security.SignatureMaxSkewSeconds,
		"debug_enabled":                        c.Debug.Enabled,
		"management_enabled":                   c.Management.Enabled,
		"management_write_enabled":             c.Management.WriteEnabled,
		"management_token_configured":          strings.TrimSpace(c.Management.APIToken) != "",
		"management_token_file_configured":     strings.TrimSpace(c.Management.APITokenFile) != "",
		"agent_auth_configured":                strings.TrimSpace(c.Security.AgentSharedSecret) != "",
		"agent_auth_file_configured":           strings.TrimSpace(c.Security.AgentSharedSecretFile) != "",
		"storage_engine":                       c.Storage.Engine,
		"storage_path":                         c.Storage.Path,
		"storage_sync_writes":                  c.Storage.SyncWrites,
		"storage_backup_on_migration":          c.Storage.BackupOnMigration,
		"storage_postgres_configured":          strings.TrimSpace(c.Storage.Postgres.DSN) != "",
		"storage_postgres_dsn_file_configured": strings.TrimSpace(c.Storage.Postgres.DSNFile) != "",
		"storage_postgres_dsn":                 storage.RedactDSN(c.Storage.Postgres.DSN),
		"storage_postgres_sslmode":             c.Storage.Postgres.SSLMode,
		"alerts_enabled":                       c.Alerts.Enabled,
		"alerts_evaluation_interval_seconds":   c.Alerts.EvaluationIntervalSeconds,
		"alerts_stale_after_seconds":           c.Alerts.StaleAfterSeconds,
		"alerts_critical_stale_after_seconds":  c.Alerts.CriticalStaleAfterSeconds,
		"alerts_max_alerts":                    c.Alerts.MaxAlerts,
		"notifications_enabled":                c.Notifications.Enabled,
		"notifications_channels_count":         len(c.Notifications.Channels),
		"log_path":                             c.Logging.Path,
	}
}
