package storage

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestJSONLStoreWritesValidJSONLines(t *testing.T) {
	dir := t.TempDir()
	store := NewJSONLStore(filepath.Join(dir, "events"), true)
	if err := store.Open(context.Background()); err != nil {
		t.Fatalf("open jsonl store: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })

	record := ShadowEventRecord{
		ID:             NewShadowEventID(),
		ReceivedAt:     time.Now().UTC(),
		RemoteAddr:     "127.0.0.1",
		SchemaVersion:  "r3.shadow.v1",
		PHPAction:      "allow",
		PHPReason:      "test",
		SiteHost:       "example.com",
		RequestPath:    "/product/test",
		Payload:        json.RawMessage(`{"ok":true}`),
		StorageVersion: StorageVersionJSONL,
	}
	if err := store.StoreShadowEvent(context.Background(), record); err != nil {
		t.Fatalf("store event: %v", err)
	}

	f, err := os.Open(filepath.Join(dir, "events", defaultJSONLFileName))
	if err != nil {
		t.Fatalf("open written jsonl: %v", err)
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	if !scanner.Scan() {
		t.Fatal("expected one jsonl line")
	}
	line := scanner.Text()
	var decoded ShadowEventRecord
	if err := json.Unmarshal([]byte(line), &decoded); err != nil {
		t.Fatalf("line should be valid json: %v line=%s", err, line)
	}
	if decoded.PHPAction != "allow" || decoded.StorageVersion != StorageVersionJSONL {
		t.Fatalf("unexpected decoded record: %+v", decoded)
	}
}

func TestJSONLStoreCreatesMissingDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "missing", "nested")
	store := NewJSONLStore(dir, false)
	if err := store.Open(context.Background()); err != nil {
		t.Fatalf("open should create directory: %v", err)
	}
	defer store.Close()
	if _, err := os.Stat(filepath.Join(dir, defaultJSONLFileName)); err != nil {
		t.Fatalf("expected jsonl file to exist: %v", err)
	}
}

func TestStoreFactoryReturnsJSONLStore(t *testing.T) {
	store, err := NewStore(Options{Engine: EngineJSONL, Path: filepath.Join(t.TempDir(), "events")})
	if err != nil {
		t.Fatalf("expected jsonl store: %v", err)
	}
	if _, ok := store.(*JSONLStore); !ok {
		t.Fatalf("expected *JSONLStore, got %T", store)
	}
}

func TestStoreFactoryBadgerFailsClearlyWhenUnavailable(t *testing.T) {
	_, err := NewStore(Options{Engine: EngineBadger, Path: filepath.Join(t.TempDir(), "badger")})
	if err == nil {
		t.Fatal("expected badger unavailable error")
	}
	if !strings.Contains(err.Error(), "storage engine badger requested but real BadgerDB implementation is not available") {
		t.Fatalf("unexpected error: %v", err)
	}
}
