package config

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"unixsee-campaign-gateway/agent/internal/policy"
)

type Config struct {
	Agent                  AgentConfig       `yaml:"agent"`
	Security               SecurityConfig    `yaml:"security"`
	Storage                StorageConfig     `yaml:"storage"`
	Logging                LoggingConfig     `yaml:"logging"`
	Limits                 LimitsConfig      `yaml:"limits"`
	Decision               DecisionConfig    `yaml:"decision"`
	Diagnostics            DiagnosticsConfig `yaml:"diagnostics"`
	Mother                 MotherConfig      `yaml:"mother"`
	Telemetry              TelemetryConfig   `yaml:"telemetry"`
	Policy                 policy.Profile    `yaml:"policy"`
	PolicyStatus           string            `yaml:"-"`
	PolicyError            string            `yaml:"-"`
	PolicyConfiguredSource string            `yaml:"-"`
}

type AgentConfig struct {
	ID         string `yaml:"id"`
	ListenAddr string `yaml:"listen_addr"`
	Mode       string `yaml:"mode"`
}

type SecurityConfig struct {
	ShadowSecret     string `yaml:"shadow_secret"`
	ShadowSecretFile string `yaml:"shadow_secret_file"`
	RequireSignature bool   `yaml:"require_signature"`
	AllowRemoteBind  bool   `yaml:"allow_remote_bind"`
}

type StorageConfig struct {
	Engine     string `yaml:"engine"`
	Path       string `yaml:"path"`
	SyncWrites bool   `yaml:"sync_writes"`
}

type LoggingConfig struct {
	Level string `yaml:"level"`
	Path  string `yaml:"path"`
}

type LimitsConfig struct {
	MaxBodyBytes     int64 `yaml:"max_body_bytes"`
	RequestTimeoutMS int   `yaml:"request_timeout_ms"`
}

type DecisionConfig struct {
	Enabled        bool   `yaml:"enabled"`
	Mode           string `yaml:"mode"`
	DefaultAction  string `yaml:"default_action"`
	CompareUnknown bool   `yaml:"compare_unknown"`
}

type DiagnosticsConfig struct {
	Enabled                bool `yaml:"enabled"`
	RecentMismatchLimit    int  `yaml:"recent_mismatch_limit"`
	ExposeRecentMismatches bool `yaml:"expose_recent_mismatches"`
	IncludeUserAgent       bool `yaml:"include_user_agent"`
	IncludeIP              bool `yaml:"include_ip"`
}

type MotherConfig struct {
	Enabled              bool   `yaml:"enabled"`
	BaseURL              string `yaml:"base_url"`
	AgentID              string `yaml:"agent_id"`
	SharedSecret         string `yaml:"shared_secret"`
	SharedSecretFile     string `yaml:"shared_secret_file"`
	RequireSignature     bool   `yaml:"require_signature"`
	PolicyPullTimeoutMS  int    `yaml:"policy_pull_timeout_ms"`
	PolicyRefreshSeconds int    `yaml:"policy_refresh_seconds"`
	UseLastKnownGood     bool   `yaml:"use_last_known_good"`
	PolicyCachePath      string `yaml:"policy_cache_path"`
}

type TelemetryConfig struct {
	Enabled             bool `yaml:"enabled"`
	PushIntervalSeconds int  `yaml:"push_interval_seconds"`
	PushTimeoutMS       int  `yaml:"push_timeout_ms"`
}

func Defaults() Config {
	return Config{
		Agent: AgentConfig{
			ID:         "local-dev-agent",
			ListenAddr: "127.0.0.1:8731",
			Mode:       "shadow",
		},
		Security: SecurityConfig{
			ShadowSecret:     "",
			RequireSignature: false,
			AllowRemoteBind:  false,
		},
		Storage: StorageConfig{
			Engine:     "jsonl",
			Path:       "./data/agent-events",
			SyncWrites: false,
		},
		Logging: LoggingConfig{
			Level: "info",
			Path:  "./logs/unixsee-agent.log",
		},
		Limits: LimitsConfig{
			MaxBodyBytes:     1048576,
			RequestTimeoutMS: 500,
		},
		Decision: DecisionConfig{
			Enabled:        true,
			Mode:           "comparator",
			DefaultAction:  "allow",
			CompareUnknown: false,
		},
		Diagnostics: DiagnosticsConfig{
			Enabled:                true,
			RecentMismatchLimit:    100,
			ExposeRecentMismatches: true,
			IncludeUserAgent:       false,
			IncludeIP:              false,
		},
		Mother: MotherConfig{
			Enabled:              false,
			BaseURL:              "http://127.0.0.1:8732",
			AgentID:              "local-dev-agent",
			SharedSecret:         "",
			RequireSignature:     false,
			PolicyPullTimeoutMS:  500,
			PolicyRefreshSeconds: 30,
			UseLastKnownGood:     true,
			PolicyCachePath:      "./data/policy-cache/last-known-policy.json",
		},
		Telemetry: TelemetryConfig{
			Enabled:             true,
			PushIntervalSeconds: 30,
			PushTimeoutMS:       700,
		},
		Policy:                 policy.DefaultLocalProfile(),
		PolicyStatus:           policy.StatusLocal,
		PolicyConfiguredSource: policy.SourceLocal,
	}
}

func Load(path string) (Config, error) {
	cfg := Defaults()
	if strings.TrimSpace(path) == "" {
		return cfg, cfg.ApplyDefaultsAndValidate()
	}

	file, err := os.Open(path)
	if err != nil {
		return cfg, fmt.Errorf("read config: %w", err)
	}
	defer file.Close()

	if err := parseSimpleYAML(bufio.NewScanner(file), &cfg); err != nil {
		return cfg, fmt.Errorf("parse config yaml: %w", err)
	}
	if err := cfg.ApplyDefaultsAndValidate(); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func parseSimpleYAML(scanner *bufio.Scanner, cfg *Config) error {
	blocks := map[int][]string{}
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		raw := scanner.Text()
		line := strings.TrimRight(raw, " \t\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		indent := leadingSpaces(line)
		for level := range blocks {
			if level >= indent {
				delete(blocks, level)
			}
		}

		if strings.HasPrefix(trimmed, "- ") {
			parent, ok := deepestBlock(blocks, indent)
			if !ok {
				return fmt.Errorf("line %d: list item outside section", lineNo)
			}
			value := parseScalar(strings.TrimSpace(strings.TrimPrefix(trimmed, "- ")))
			if err := appendPath(parent, value, cfg); err != nil {
				return fmt.Errorf("line %d: %w", lineNo, err)
			}
			continue
		}

		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) != 2 {
			return fmt.Errorf("line %d: invalid key/value", lineNo)
		}
		key := strings.TrimSpace(parts[0])
		valueRaw := strings.TrimSpace(parts[1])
		parent, _ := deepestBlock(blocks, indent)
		fullPath := append(append([]string(nil), parent...), key)
		if valueRaw == "" {
			if strings.Join(fullPath, ".") == "policy.methods.managed" {
				cfg.Policy.Methods.Managed = nil
			}
			blocks[indent] = fullPath
			continue
		}
		value := parseScalar(valueRaw)
		if err := assignPath(fullPath, value, cfg); err != nil {
			return fmt.Errorf("line %d: %w", lineNo, err)
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	return nil
}

func leadingSpaces(line string) int {
	count := 0
	for _, r := range line {
		if r == ' ' {
			count++
			continue
		}
		break
	}
	return count
}

func deepestBlock(blocks map[int][]string, indent int) ([]string, bool) {
	levels := make([]int, 0, len(blocks))
	for level := range blocks {
		if level < indent {
			levels = append(levels, level)
		}
	}
	if len(levels) == 0 {
		return nil, false
	}
	sort.Ints(levels)
	return blocks[levels[len(levels)-1]], true
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

func parseInlineList(value string) ([]string, bool, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, false, nil
	}
	if !strings.HasPrefix(value, "[") {
		if strings.Contains(value, "]") {
			return nil, true, fmt.Errorf("malformed inline list: unexpected closing bracket")
		}
		return nil, false, nil
	}
	if !strings.HasSuffix(value, "]") {
		return nil, true, fmt.Errorf("malformed inline list: missing closing bracket")
	}

	inner := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(value, "["), "]"))
	if inner == "" {
		return []string{}, true, nil
	}

	parts := make([]string, 0, 4)
	var current strings.Builder
	var quote rune
	escape := false

	for _, r := range inner {
		if escape {
			current.WriteRune(r)
			escape = false
			continue
		}
		if quote == '"' && r == '\\' {
			current.WriteRune(r)
			escape = true
			continue
		}
		if quote != 0 {
			current.WriteRune(r)
			if r == quote {
				quote = 0
			}
			continue
		}
		switch r {
		case '"', '\'':
			quote = r
			current.WriteRune(r)
		case ',':
			parts = append(parts, current.String())
			current.Reset()
		default:
			current.WriteRune(r)
		}
	}
	if quote != 0 {
		return nil, true, fmt.Errorf("malformed inline list: unterminated quoted value")
	}
	if escape {
		return nil, true, fmt.Errorf("malformed inline list: trailing escape")
	}
	parts = append(parts, current.String())

	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item, err := parseInlineListItem(part)
		if err != nil {
			return nil, true, err
		}
		items = append(items, item)
	}
	return items, true, nil
}

func parseInlineListItem(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("malformed inline list: empty item")
	}
	if strings.HasPrefix(value, "[") || strings.HasSuffix(value, "]") {
		return "", fmt.Errorf("malformed inline list: nested lists are not supported")
	}

	if value[0] == '"' || value[0] == '\'' {
		quote := value[0]
		if len(value) < 2 || value[len(value)-1] != quote {
			return "", fmt.Errorf("malformed inline list: unterminated quoted value")
		}
		if quote == '"' {
			unq, err := strconv.Unquote(value)
			if err != nil {
				return "", fmt.Errorf("malformed inline list: invalid quoted value: %w", err)
			}
			return strings.TrimSpace(unq), nil
		}
		inner := strings.ReplaceAll(value[1:len(value)-1], "''", "'")
		return strings.TrimSpace(inner), nil
	}
	if strings.ContainsAny(value, "\"'") {
		return "", fmt.Errorf("malformed inline list: stray quote in unquoted value")
	}
	return value, nil
}

func assignPath(path []string, value string, cfg *Config) error {
	key := strings.Join(path, ".")
	switch key {
	case "agent.id":
		cfg.Agent.ID = value
	case "agent.listen_addr":
		cfg.Agent.ListenAddr = value
	case "agent.mode":
		cfg.Agent.Mode = value
	case "security.shadow_secret":
		cfg.Security.ShadowSecret = os.ExpandEnv(value)
	case "security.shadow_secret_file":
		cfg.Security.ShadowSecretFile = os.ExpandEnv(value)
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
	case "storage.badger_path":
		cfg.Storage.Path = value
	case "storage.badger_sync_writes":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Storage.SyncWrites = v
	case "logging.level":
		cfg.Logging.Level = value
	case "logging.path":
		cfg.Logging.Path = value
	case "limits.max_body_bytes":
		v, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return fmt.Errorf("invalid max_body_bytes: %w", err)
		}
		cfg.Limits.MaxBodyBytes = v
	case "limits.request_timeout_ms":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid request_timeout_ms: %w", err)
		}
		cfg.Limits.RequestTimeoutMS = v
	case "decision.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Decision.Enabled = v
	case "decision.mode":
		cfg.Decision.Mode = value
	case "decision.default_action":
		cfg.Decision.DefaultAction = value
	case "decision.compare_unknown":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Decision.CompareUnknown = v
	case "diagnostics.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Diagnostics.Enabled = v
	case "diagnostics.recent_mismatch_limit":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid recent_mismatch_limit: %w", err)
		}
		cfg.Diagnostics.RecentMismatchLimit = v
	case "diagnostics.expose_recent_mismatches":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Diagnostics.ExposeRecentMismatches = v
	case "diagnostics.include_user_agent":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Diagnostics.IncludeUserAgent = v
	case "diagnostics.include_ip":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Diagnostics.IncludeIP = v
	case "mother.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Mother.Enabled = v
	case "mother.base_url":
		cfg.Mother.BaseURL = value
	case "mother.agent_id":
		cfg.Mother.AgentID = value
	case "mother.shared_secret":
		cfg.Mother.SharedSecret = os.ExpandEnv(value)
	case "mother.shared_secret_file":
		cfg.Mother.SharedSecretFile = os.ExpandEnv(value)
	case "mother.require_signature":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Mother.RequireSignature = v
	case "mother.policy_pull_timeout_ms":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid mother.policy_pull_timeout_ms: %w", err)
		}
		cfg.Mother.PolicyPullTimeoutMS = v
	case "mother.policy_refresh_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid mother.policy_refresh_seconds: %w", err)
		}
		cfg.Mother.PolicyRefreshSeconds = v
	case "mother.use_last_known_good":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Mother.UseLastKnownGood = v
	case "mother.policy_cache_path":
		cfg.Mother.PolicyCachePath = value
	case "telemetry.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Telemetry.Enabled = v
	case "telemetry.push_interval_seconds":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid telemetry.push_interval_seconds: %w", err)
		}
		cfg.Telemetry.PushIntervalSeconds = v
	case "telemetry.push_timeout_ms":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid telemetry.push_timeout_ms: %w", err)
		}
		cfg.Telemetry.PushTimeoutMS = v
	case "policy.source":
		cfg.Policy.Source = value
	case "policy.profile_id":
		cfg.Policy.ProfileID = value
	case "policy.version":
		v, err := strconv.Atoi(value)
		if err != nil {
			return fmt.Errorf("invalid policy.version: %w", err)
		}
		cfg.Policy.Version = v
	case "policy.gateway.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Gateway.Enabled = v
	case "policy.campaign.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Campaign.Enabled = v
	case "policy.campaign.mode":
		cfg.Policy.Campaign.Mode = value
	case "policy.campaign.default_action":
		cfg.Policy.Campaign.DefaultAction = value
	case "policy.storage.fail_mode":
		cfg.Policy.Storage.FailMode = value
	case "policy.methods.managed":
		list, ok, err := parseInlineList(value)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("policy.methods.managed must be a list")
		}
		cfg.Policy.Methods.Managed = list
	case "policy.bypass.static_assets":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.StaticAssets = v
	case "policy.bypass.wp_internal":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.WPInternal = v
	case "policy.bypass.admin":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.Admin = v
	case "policy.bypass.checkout":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.Checkout = v
	case "policy.bypass.cart":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.Cart = v
	case "policy.bypass.account":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.Account = v
	case "policy.bypass.api":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bypass.API = v
	case "policy.routes.static_asset_action":
		cfg.Policy.Routes.StaticAssetAction = value
	case "policy.routes.wp_internal_action":
		cfg.Policy.Routes.WPInternalAction = value
	case "policy.routes.admin_action":
		cfg.Policy.Routes.AdminAction = value
	case "policy.routes.checkout_action":
		cfg.Policy.Routes.CheckoutAction = value
	case "policy.routes.cart_action":
		cfg.Policy.Routes.CartAction = value
	case "policy.routes.account_action":
		cfg.Policy.Routes.AccountAction = value
	case "policy.routes.api_action":
		cfg.Policy.Routes.APIAction = value
	case "policy.routes.product_action":
		cfg.Policy.Routes.ProductAction = value
	case "policy.routes.other_action":
		cfg.Policy.Routes.OtherAction = value
	case "policy.bot.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Bot.Enabled = v
	case "policy.bot.default_action":
		cfg.Policy.Bot.DefaultAction = value
	case "policy.queue.enabled":
		v, err := parseBool(value)
		if err != nil {
			return err
		}
		cfg.Policy.Queue.Enabled = v
	case "policy.queue.default_action":
		cfg.Policy.Queue.DefaultAction = value
	default:
		return fmt.Errorf("unknown config key %q", key)
	}
	return nil
}

func appendPath(path []string, value string, cfg *Config) error {
	key := strings.Join(path, ".")
	switch key {
	case "policy.methods.managed":
		cfg.Policy.Methods.Managed = append(cfg.Policy.Methods.Managed, value)
	default:
		return fmt.Errorf("unsupported list key %q", key)
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
	if strings.TrimSpace(c.Security.ShadowSecretFile) != "" {
		v, err := readSecretFile("security.shadow_secret", c.Security.ShadowSecretFile)
		if err != nil {
			return err
		}
		c.Security.ShadowSecret = v
	}
	if strings.TrimSpace(c.Mother.SharedSecretFile) != "" {
		v, err := readSecretFile("mother.shared_secret", c.Mother.SharedSecretFile)
		if err != nil {
			return err
		}
		c.Mother.SharedSecret = v
	}
	return nil
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

func (c *Config) ApplyDefaultsAndValidate() error {
	defaults := Defaults()
	if strings.TrimSpace(c.Agent.ID) == "" {
		c.Agent.ID = defaults.Agent.ID
	}
	if strings.TrimSpace(c.Agent.ListenAddr) == "" {
		c.Agent.ListenAddr = defaults.Agent.ListenAddr
	}
	if strings.TrimSpace(c.Agent.Mode) == "" {
		c.Agent.Mode = defaults.Agent.Mode
	}
	if strings.TrimSpace(c.Storage.Engine) == "" {
		c.Storage.Engine = defaults.Storage.Engine
	}
	c.Storage.Engine = strings.ToLower(strings.TrimSpace(c.Storage.Engine))
	if strings.TrimSpace(c.Storage.Path) == "" {
		c.Storage.Path = defaults.Storage.Path
	}
	if strings.TrimSpace(c.Logging.Level) == "" {
		c.Logging.Level = defaults.Logging.Level
	}
	if strings.TrimSpace(c.Logging.Path) == "" {
		c.Logging.Path = defaults.Logging.Path
	}
	if c.Limits.MaxBodyBytes <= 0 {
		c.Limits.MaxBodyBytes = defaults.Limits.MaxBodyBytes
	}
	if c.Limits.RequestTimeoutMS <= 0 {
		c.Limits.RequestTimeoutMS = defaults.Limits.RequestTimeoutMS
	}
	if strings.TrimSpace(c.Decision.Mode) == "" {
		c.Decision.Mode = defaults.Decision.Mode
	}
	if strings.TrimSpace(c.Decision.DefaultAction) == "" {
		c.Decision.DefaultAction = defaults.Decision.DefaultAction
	}
	c.Decision.Mode = strings.ToLower(strings.TrimSpace(c.Decision.Mode))
	c.Decision.DefaultAction = strings.ToLower(strings.TrimSpace(c.Decision.DefaultAction))
	if strings.TrimSpace(c.Mother.BaseURL) == "" {
		c.Mother.BaseURL = defaults.Mother.BaseURL
	}
	if strings.TrimSpace(c.Mother.AgentID) == "" {
		c.Mother.AgentID = c.Agent.ID
	}
	if c.Mother.PolicyPullTimeoutMS <= 0 {
		c.Mother.PolicyPullTimeoutMS = defaults.Mother.PolicyPullTimeoutMS
	}
	if c.Mother.PolicyRefreshSeconds <= 0 {
		c.Mother.PolicyRefreshSeconds = defaults.Mother.PolicyRefreshSeconds
	}
	if strings.TrimSpace(c.Mother.PolicyCachePath) == "" {
		c.Mother.PolicyCachePath = defaults.Mother.PolicyCachePath
	}
	if c.Telemetry.PushIntervalSeconds <= 0 {
		c.Telemetry.PushIntervalSeconds = defaults.Telemetry.PushIntervalSeconds
	}
	if c.Telemetry.PushTimeoutMS <= 0 {
		c.Telemetry.PushTimeoutMS = defaults.Telemetry.PushTimeoutMS
	}
	if err := c.ResolveSecrets(); err != nil {
		return err
	}

	configuredPolicy := policy.ApplyDefaults(c.Policy)
	c.PolicyConfiguredSource = configuredPolicy.Source
	resolved, err := policy.Resolve(context.Background(), configuredPolicy, policy.MotherOptions{
		Enabled:              c.Mother.Enabled,
		BaseURL:              c.Mother.BaseURL,
		AgentID:              c.Mother.AgentID,
		SharedSecret:         c.Mother.SharedSecret,
		Timeout:              time.Duration(c.Mother.PolicyPullTimeoutMS) * time.Millisecond,
		UseLastKnownGood:     c.Mother.UseLastKnownGood,
		PolicyCachePath:      c.Mother.PolicyCachePath,
		PolicyRefreshSeconds: c.Mother.PolicyRefreshSeconds,
	})
	if err != nil {
		return err
	}
	c.Policy = resolved.Profile
	c.PolicyStatus = resolved.Status
	c.PolicyError = resolved.Error
	return c.Validate()
}

func (c Config) Validate() error {
	if c.Agent.Mode != "shadow" {
		return fmt.Errorf("unsupported agent mode %q: R7 supports shadow only", c.Agent.Mode)
	}
	if c.Storage.Engine != "jsonl" && c.Storage.Engine != "badger" {
		return fmt.Errorf("unsupported storage engine %q", c.Storage.Engine)
	}
	if strings.TrimSpace(c.Storage.Path) == "" {
		return fmt.Errorf("storage.path must not be empty")
	}
	if c.Limits.MaxBodyBytes < 1024 || c.Limits.MaxBodyBytes > 10*1024*1024 {
		return fmt.Errorf("limits.max_body_bytes must be between 1024 and 10485760")
	}
	if c.Limits.RequestTimeoutMS < 10 || c.Limits.RequestTimeoutMS > 30000 {
		return fmt.Errorf("limits.request_timeout_ms must be between 10 and 30000")
	}
	if c.Decision.Mode != "comparator" {
		return fmt.Errorf("unsupported decision mode %q: R7 supports comparator only", c.Decision.Mode)
	}
	if c.Diagnostics.RecentMismatchLimit < 0 || c.Diagnostics.RecentMismatchLimit > 10000 {
		return fmt.Errorf("diagnostics.recent_mismatch_limit must be between 0 and 10000")
	}
	if c.Mother.PolicyPullTimeoutMS < 1 || c.Mother.PolicyPullTimeoutMS > 30000 {
		return fmt.Errorf("mother.policy_pull_timeout_ms must be between 1 and 30000")
	}
	if c.Mother.PolicyRefreshSeconds < 1 || c.Mother.PolicyRefreshSeconds > 86400 {
		return fmt.Errorf("mother.policy_refresh_seconds must be between 1 and 86400")
	}
	if c.Mother.RequireSignature && strings.TrimSpace(c.Mother.SharedSecret) == "" {
		return fmt.Errorf("mother.require_signature=true requires mother.shared_secret")
	}
	if c.Telemetry.PushIntervalSeconds < 1 || c.Telemetry.PushIntervalSeconds > 86400 {
		return fmt.Errorf("telemetry.push_interval_seconds must be between 1 and 86400")
	}
	if c.Telemetry.PushTimeoutMS < 1 || c.Telemetry.PushTimeoutMS > 30000 {
		return fmt.Errorf("telemetry.push_timeout_ms must be between 1 and 30000")
	}
	switch c.Decision.DefaultAction {
	case "allow", "queue", "block", "wait", "pass", "unknown":
	default:
		return fmt.Errorf("unsupported decision.default_action %q", c.Decision.DefaultAction)
	}
	if err := policy.Validate(c.Policy); err != nil {
		return err
	}
	if err := validateListenAddr(c.Agent.ListenAddr, c.Security.AllowRemoteBind); err != nil {
		return err
	}
	return nil
}

func validateListenAddr(addr string, allowRemote bool) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("invalid listen_addr %q: %w", addr, err)
	}
	if host == "" {
		return errors.New("listen_addr host is empty; use 127.0.0.1:8731 unless remote bind is explicitly allowed")
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
		"agent_id":                       c.Agent.ID,
		"listen_addr":                    c.Agent.ListenAddr,
		"mode":                           c.Agent.Mode,
		"require_signature":              c.Security.RequireSignature,
		"allow_remote_bind":              c.Security.AllowRemoteBind,
		"storage_engine":                 c.Storage.Engine,
		"storage_path":                   c.Storage.Path,
		"log_path":                       c.Logging.Path,
		"max_body_bytes":                 c.Limits.MaxBodyBytes,
		"decision_enabled":               c.Decision.Enabled,
		"decision_mode":                  c.Decision.Mode,
		"compare_unknown":                c.Decision.CompareUnknown,
		"diagnostics_enabled":            c.Diagnostics.Enabled,
		"recent_mismatch_limit":          c.Diagnostics.RecentMismatchLimit,
		"expose_recent_mismatches":       c.Diagnostics.ExposeRecentMismatches,
		"diagnostics_include_ip":         c.Diagnostics.IncludeIP,
		"diagnostics_include_user_agent": c.Diagnostics.IncludeUserAgent,
		"mother_enabled":                 c.Mother.Enabled,
		"mother_base_url":                c.Mother.BaseURL,
		"mother_agent_id":                c.Mother.AgentID,
		"mother_require_signature":       c.Mother.RequireSignature,
		"shadow_auth_configured":         strings.TrimSpace(c.Security.ShadowSecret) != "",
		"shadow_auth_file_configured":    strings.TrimSpace(c.Security.ShadowSecretFile) != "",
		"mother_auth_configured":         strings.TrimSpace(c.Mother.SharedSecret) != "",
		"mother_auth_file_configured":    strings.TrimSpace(c.Mother.SharedSecretFile) != "",
		"mother_policy_refresh_seconds":  c.Mother.PolicyRefreshSeconds,
		"mother_use_last_known_good":     c.Mother.UseLastKnownGood,
		"policy_configured_source":       c.PolicyConfiguredSource,
		"policy_source":                  c.Policy.Source,
		"policy_profile_id":              c.Policy.ProfileID,
		"policy_version":                 c.Policy.Version,
		"policy_status":                  c.PolicyStatus,
		"policy_queue_enabled":           c.Policy.Queue.Enabled,
		"policy_bot_enabled":             c.Policy.Bot.Enabled,
	}
}
