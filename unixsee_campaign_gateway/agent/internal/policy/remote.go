package policy

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	StatusLocal           = "local"
	StatusFresh           = "fresh"
	StatusLastKnownGood   = "last_known_good"
	StatusFallbackDefault = "fallback_default"
	StatusInvalidFallback = "invalid_fallback"
)

type Effective struct {
	Profile Profile
	Status  string
	Error   string
}

type MotherOptions struct {
	Enabled              bool
	BaseURL              string
	AgentID              string
	SharedSecret         string
	Timeout              time.Duration
	UseLastKnownGood     bool
	PolicyCachePath      string
	PolicyRefreshSeconds int
	HTTPClient           *http.Client
}

type motherPolicyResponse struct {
	OK     bool    `json:"ok"`
	Policy Profile `json:"policy"`
	Error  string  `json:"error,omitempty"`
}

func CanonicalPolicyRequest(method string, path string, timestamp string) string {
	return method + "\n" + path + "\n" + timestamp
}

func SanitizeBaseURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u == nil {
		return strings.TrimSpace(raw)
	}
	u.User = nil
	return u.String()
}

func SanitizeError(errText string, secrets ...string) string {
	out := strings.TrimSpace(errText)
	for _, secret := range secrets {
		secret = strings.TrimSpace(secret)
		if secret != "" {
			out = strings.ReplaceAll(out, secret, "[redacted]")
		}
	}
	if len(out) > 300 {
		out = out[:300] + "..."
	}
	return out
}

func Resolve(ctx context.Context, configured Profile, opts MotherOptions) (Effective, error) {
	configured = ApplyDefaults(configured)
	if configured.Source != SourceMother {
		p, err := LoadLocal(configured)
		if err != nil {
			return Effective{}, err
		}
		return Effective{Profile: p, Status: StatusLocal}, nil
	}

	if !opts.Enabled {
		fallback := DefaultLocalProfile()
		return Effective{Profile: fallback, Status: StatusFallbackDefault, Error: "policy.source=mother but mother.enabled=false"}, nil
	}

	fetched, err := FetchMotherPolicy(ctx, opts)
	if err == nil {
		if err := SaveLastKnownGood(opts.PolicyCachePath, fetched); err != nil {
			// Cache write failure must not prevent shadow-only startup.
			return Effective{Profile: fetched, Status: StatusFresh, Error: err.Error()}, nil
		}
		return Effective{Profile: fetched, Status: StatusFresh}, nil
	}

	statusOnFallback := StatusFallbackDefault
	if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "unsupported") {
		statusOnFallback = StatusInvalidFallback
	}

	if opts.UseLastKnownGood {
		cached, cacheErr := LoadLastKnownGood(opts.PolicyCachePath)
		if cacheErr == nil {
			return Effective{Profile: cached, Status: StatusLastKnownGood, Error: err.Error()}, nil
		}
	}

	fallback := DefaultLocalProfile()
	return Effective{Profile: fallback, Status: statusOnFallback, Error: err.Error()}, nil
}

func FetchMotherPolicy(ctx context.Context, opts MotherOptions) (Profile, error) {
	base := strings.TrimRight(strings.TrimSpace(opts.BaseURL), "/")
	if base == "" {
		return Profile{}, fmt.Errorf("mother base_url is empty")
	}
	agentID := strings.TrimSpace(opts.AgentID)
	if agentID == "" {
		return Profile{}, fmt.Errorf("mother agent_id is empty")
	}
	path := "/v1/agents/" + url.PathEscape(agentID) + "/policy"
	endpoint := base + path

	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 500 * time.Millisecond
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: timeout}
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return Profile{}, fmt.Errorf("create mother policy request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Unixsee-Agent-ID", agentID)
	if secret := strings.TrimSpace(opts.SharedSecret); secret != "" {
		ts := fmt.Sprintf("%d", time.Now().Unix())
		canonical := CanonicalPolicyRequest(http.MethodGet, path, ts)
		req.Header.Set("X-Unixsee-Agent-Timestamp", ts)
		req.Header.Set("X-Unixsee-Agent-Signature", "sha256="+hmacSHA256Hex(secret, canonical))
	}

	resp, err := client.Do(req)
	if err != nil {
		return Profile{}, fmt.Errorf("fetch mother policy: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Profile{}, fmt.Errorf("fetch mother policy: status %d", resp.StatusCode)
	}
	dec := json.NewDecoder(io.LimitReader(resp.Body, 1024*1024))
	var out motherPolicyResponse
	if err := dec.Decode(&out); err != nil {
		return Profile{}, fmt.Errorf("decode mother policy: %w", err)
	}
	if !out.OK {
		if strings.TrimSpace(out.Error) != "" {
			return Profile{}, fmt.Errorf("mother policy response not ok: %s", out.Error)
		}
		return Profile{}, fmt.Errorf("mother policy response not ok")
	}
	profile := ApplyDefaults(out.Policy)
	if err := Validate(profile); err != nil {
		return Profile{}, fmt.Errorf("invalid mother policy: %w", err)
	}
	return profile, nil
}

func SaveLastKnownGood(path string, p Profile) error {
	path = strings.TrimSpace(path)
	if path == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("create policy cache dir: %w", err)
	}
	b, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal policy cache: %w", err)
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0600); err != nil {
		return fmt.Errorf("write policy cache: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		return fmt.Errorf("replace policy cache: %w", err)
	}
	return nil
}

func LoadLastKnownGood(path string) (Profile, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return Profile{}, fmt.Errorf("policy cache path is empty")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return Profile{}, fmt.Errorf("read policy cache: %w", err)
	}
	var p Profile
	if err := json.Unmarshal(b, &p); err != nil {
		return Profile{}, fmt.Errorf("decode policy cache: %w", err)
	}
	p = ApplyDefaults(p)
	if err := Validate(p); err != nil {
		return Profile{}, fmt.Errorf("invalid policy cache: %w", err)
	}
	return p, nil
}

func hmacSHA256Hex(secret string, message string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	return hex.EncodeToString(mac.Sum(nil))
}
