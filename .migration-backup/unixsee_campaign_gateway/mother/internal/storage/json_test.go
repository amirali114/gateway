package storage

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"unixsee-campaign-gateway/mother/internal/policy"
)

func newJSONStoreForTest(t *testing.T) (*JSONStore, string) {
	t.Helper()
	dir := filepath.Join(t.TempDir(), "mother-state")
	store := NewJSONStore(Options{Engine: EngineJSON, Path: dir, SyncWrites: true, BackupOnMigration: true})
	if err := store.Open(context.Background()); err != nil {
		t.Fatalf("open json store: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })
	return store, filepath.Join(dir, "mother-state.json")
}

func TestJSONStorePersistsStateAcrossReload(t *testing.T) {
	ctx := context.Background()
	store, stateFile := newJSONStoreForTest(t)
	agentID := "iran-staging-agent"
	cfg := DefaultControlConfig()
	cfg.Queue.Enabled = true
	if _, err := store.RegisterPolicyPull(ctx, agentID, "127.0.0.1", policy.DefaultRemotePolicy()); err != nil {
		t.Fatalf("register pull: %v", err)
	}
	if _, err := store.SaveDraftConfig(ctx, agentID, cfg); err != nil {
		t.Fatalf("save draft: %v", err)
	}
	if _, err := store.PublishDraftConfig(ctx, agentID); err != nil {
		t.Fatalf("publish: %v", err)
	}
	payload := TelemetryPayload{AgentID: agentID, Mode: "shadow"}
	payload.Shadow.Received = 12
	payload.Shadow.Stored = 12
	payload.Shadow.Comparison = map[string]any{"matched": 11, "mismatched": 1, "match_rate": 91.6}
	if _, err := store.SaveTelemetry(ctx, agentID, "127.0.0.1", payload); err != nil {
		t.Fatalf("telemetry: %v", err)
	}
	if err := store.AddEvent(ctx, agentID, "test_event", "info", "test event", map[string]any{"ok": true}); err != nil {
		t.Fatalf("event: %v", err)
	}

	reloaded := NewJSONStore(Options{Engine: EngineJSON, Path: filepath.Dir(stateFile), SyncWrites: true, BackupOnMigration: true})
	if err := reloaded.Open(ctx); err != nil {
		t.Fatalf("reload: %v", err)
	}
	defer reloaded.Close()

	agent, err := reloaded.GetAgent(ctx, agentID)
	if err != nil || agent.PullCount == 0 {
		t.Fatalf("agent did not persist: agent=%+v err=%v", agent, err)
	}
	active, err := reloaded.GetActiveConfig(ctx, agentID)
	if err != nil || active.Version == 0 || !active.Config.Queue.Enabled {
		t.Fatalf("active config did not persist: %+v err=%v", active, err)
	}
	history, err := reloaded.ConfigHistory(ctx, agentID)
	if err != nil || len(history) == 0 {
		t.Fatalf("history did not persist: len=%d err=%v", len(history), err)
	}
	tel, err := reloaded.GetTelemetry(ctx, agentID)
	if err != nil || tel.Payload.Shadow.Received != 12 {
		t.Fatalf("telemetry did not persist: %+v err=%v", tel, err)
	}
	events, err := reloaded.AgentEvents(ctx, agentID)
	if err != nil || len(events) == 0 {
		t.Fatalf("events did not persist: len=%d err=%v", len(events), err)
	}
}

func TestJSONStoreCorruptPrimaryLoadsBackup(t *testing.T) {
	ctx := context.Background()
	store, stateFile := newJSONStoreForTest(t)
	if _, err := store.RegisterPolicyPull(ctx, "agent-a", "127.0.0.1", policy.DefaultRemotePolicy()); err != nil {
		t.Fatalf("register pull: %v", err)
	}
	backup := stateFile + ".bak"
	good, err := os.ReadFile(stateFile)
	if err != nil {
		t.Fatalf("read state: %v", err)
	}
	if err := os.WriteFile(backup, good, 0o640); err != nil {
		t.Fatalf("write backup: %v", err)
	}
	if err := os.WriteFile(stateFile, []byte("{broken"), 0o640); err != nil {
		t.Fatalf("corrupt primary: %v", err)
	}

	reloaded := NewJSONStore(Options{Engine: EngineJSON, Path: filepath.Dir(stateFile), SyncWrites: true, BackupOnMigration: true})
	if err := reloaded.Open(ctx); err != nil {
		t.Fatalf("expected backup load, got %v", err)
	}
	defer reloaded.Close()
	if _, err := reloaded.GetAgent(ctx, "agent-a"); err != nil {
		t.Fatalf("backup state not loaded: %v", err)
	}
}

func TestJSONStoreEventRingLimitPersists(t *testing.T) {
	ctx := context.Background()
	store, stateFile := newJSONStoreForTest(t)
	for i := 0; i < maxEventsPerAgent+20; i++ {
		if err := store.AddEvent(ctx, "agent-ring", "ring", "info", "event", map[string]any{"i": i}); err != nil {
			t.Fatalf("add event: %v", err)
		}
	}
	reloaded := NewJSONStore(Options{Engine: EngineJSON, Path: filepath.Dir(stateFile), SyncWrites: true, BackupOnMigration: true})
	if err := reloaded.Open(ctx); err != nil {
		t.Fatalf("reload: %v", err)
	}
	defer reloaded.Close()
	events, err := reloaded.AgentEvents(ctx, "agent-ring")
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != maxEventsPerAgent {
		t.Fatalf("expected ring size %d got %d", maxEventsPerAgent, len(events))
	}
}
