package storage

import (
        "context"
        "fmt"
        "os"
        "path/filepath"
        "sync"
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

// TestJSONStoreConcurrentSavesDoNotRace exercises many goroutines triggering
// persist() at the same time (via AddEvent) and asserts that no save ever
// fails with a rename/temp-file error. Before the atomic-save concurrency fix,
// concurrent persist() calls shared a single fixed temp file path
// (mother-state.json.tmp), so one goroutine could rename it away while
// another still had it open, producing:
//
//      rename json storage temp: ...mother-state.json.tmp: no such file or directory
//
// This test fails deterministically on the old implementation under `-race`
// and reliably reproduces the bug even without `-race` given enough
// concurrent goroutines.
func TestJSONStoreConcurrentSavesDoNotRace(t *testing.T) {
        ctx := context.Background()
        store, stateFile := newJSONStoreForTest(t)

        const goroutines = 40
        const eventsPerGoroutine = 10

        var wg sync.WaitGroup
        errCh := make(chan error, goroutines*eventsPerGoroutine)
        for g := 0; g < goroutines; g++ {
                wg.Add(1)
                go func(g int) {
                        defer wg.Done()
                        agentID := fmt.Sprintf("agent-concurrent-%d", g)
                        for i := 0; i < eventsPerGoroutine; i++ {
                                if err := store.AddEvent(ctx, agentID, "concurrent_event", "info", "concurrent save test", map[string]any{"g": g, "i": i}); err != nil {
                                        errCh <- fmt.Errorf("agent %s event %d: %w", agentID, i, err)
                                }
                        }
                }(g)
        }
        wg.Wait()
        close(errCh)

        for err := range errCh {
                t.Errorf("concurrent save failed: %v", err)
        }

        if _, err := os.Stat(stateFile); err != nil {
                t.Fatalf("state file missing after concurrent saves: %v", err)
        }

        reloaded := NewJSONStore(Options{Engine: EngineJSON, Path: filepath.Dir(stateFile), SyncWrites: true, BackupOnMigration: true})
        if err := reloaded.Open(ctx); err != nil {
                t.Fatalf("reload after concurrent saves: %v", err)
        }
        defer reloaded.Close()

        events, err := reloaded.AgentEvents(ctx, "agent-concurrent-0")
        if err != nil || len(events) == 0 {
                t.Fatalf("expected events for agent-concurrent-0 to persist: len=%d err=%v", len(events), err)
        }
}

// TestJSONStoreConcurrentSavesLeaveNoStaleTempFiles ensures that concurrent
// saves never leak temp files in the storage directory: each save must either
// successfully rename its unique temp file into place, or clean it up on
// error. Stray .tmp files are the observable fingerprint of the race this fix
// addresses.
func TestJSONStoreConcurrentSavesLeaveNoStaleTempFiles(t *testing.T) {
        ctx := context.Background()
        store, stateFile := newJSONStoreForTest(t)

        const goroutines = 25
        var wg sync.WaitGroup
        for g := 0; g < goroutines; g++ {
                wg.Add(1)
                go func(g int) {
                        defer wg.Done()
                        _ = store.AddEvent(ctx, fmt.Sprintf("agent-tmp-%d", g), "tmp_check", "info", "tmp file check", nil)
                }(g)
        }
        wg.Wait()

        entries, err := os.ReadDir(filepath.Dir(stateFile))
        if err != nil {
                t.Fatalf("read storage dir: %v", err)
        }
        for _, entry := range entries {
                name := entry.Name()
                if filepath.Ext(name) == ".tmp" {
                        t.Errorf("stale temp file left behind after concurrent saves: %s", name)
                }
        }
}
