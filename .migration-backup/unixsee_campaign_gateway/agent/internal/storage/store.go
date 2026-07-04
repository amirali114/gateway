package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"unixsee-campaign-gateway/agent/internal/decision"
)

const (
	EngineJSONL  = "jsonl"
	EngineBadger = "badger"

	StorageVersionJSONL = "r4.1.jsonl.shadow.v1"
)

// Store is the durable storage contract used by the shadow receiver.
// Implementations must be concurrency-safe and must not leak secrets to logs.
type Store interface {
	Open(ctx context.Context) error
	Close() error
	StoreShadowEvent(ctx context.Context, event ShadowEventRecord) error
	Health(ctx context.Context) error
}

// Options describes the selected storage backend.
type Options struct {
	Engine     string
	Path       string
	SyncWrites bool
}

// ShadowEventRecord is the normalized durable form of a received shadow payload.
type ShadowEventRecord struct {
	ID             string              `json:"id"`
	ReceivedAt     time.Time           `json:"received_at"`
	RemoteAddr     string              `json:"remote_addr"`
	SignatureValid *bool               `json:"signature_valid,omitempty"`
	SchemaVersion  string              `json:"schema_version"`
	PHPAction      string              `json:"php_action"`
	PHPReason      string              `json:"php_reason"`
	SiteHost       string              `json:"site_host"`
	RequestPath    string              `json:"request_path"`
	AgentDecision  decision.Decision   `json:"agent_decision"`
	Comparison     decision.Comparison `json:"comparison"`
	Payload        json.RawMessage     `json:"payload"`
	StorageVersion string              `json:"storage_version"`
}

func NewStore(opts Options) (Store, error) {
	engine := strings.ToLower(strings.TrimSpace(opts.Engine))
	if engine == "" {
		engine = EngineJSONL
	}

	switch engine {
	case EngineJSONL:
		return NewJSONLStore(opts.Path, opts.SyncWrites), nil
	case EngineBadger:
		return nil, fmt.Errorf("storage engine badger requested but real BadgerDB implementation is not available")
	default:
		return nil, fmt.Errorf("unsupported storage engine %q", opts.Engine)
	}
}

func NewShadowEventID() string {
	return fmt.Sprintf("shadow:event:%d:%s", time.Now().UnixNano(), randomSuffix())
}

func randomSuffix() string {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "fallback"
	}
	return hex.EncodeToString(buf)
}
