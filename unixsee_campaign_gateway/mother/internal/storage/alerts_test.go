package storage

import (
	"context"
	"path/filepath"
	"testing"
)

func TestAlertCreateDeduplicateAndSummary(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	rec, created, err := store.UpsertAlert(ctx, AlertRecord{Scope: "agent", Type: "telemetry_stale", Severity: "warn", AgentID: "agent-a", Title: "stale", Message: "old"})
	if err != nil || !created {
		t.Fatalf("create alert: rec=%+v created=%v err=%v", rec, created, err)
	}
	rec2, created2, err := store.UpsertAlert(ctx, AlertRecord{Scope: "agent", Type: "telemetry_stale", Severity: "warn", AgentID: "agent-a", Title: "stale", Message: "old again"})
	if err != nil || created2 {
		t.Fatalf("dedupe alert: rec=%+v created=%v err=%v", rec2, created2, err)
	}
	if rec.ID != rec2.ID || rec2.OccurrenceCount != 2 {
		t.Fatalf("expected same alert with count=2, got first=%+v second=%+v", rec, rec2)
	}
	sum, err := store.AlertSummary(ctx)
	if err != nil || sum.ActiveTotal != 1 || sum.Warn != 1 {
		t.Fatalf("bad summary: %+v err=%v", sum, err)
	}
}

func TestAlertResolveMuteUnmute(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	rec, _, err := store.UpsertAlert(ctx, AlertRecord{Scope: "storage", Type: "storage_unhealthy", Severity: "critical", Title: "bad", Message: "bad"})
	if err != nil {
		t.Fatal(err)
	}
	muted, err := store.MuteAlert(ctx, rec.ID, "tester")
	if err != nil || muted.Status != AlertStatusMuted {
		t.Fatalf("mute: %+v err=%v", muted, err)
	}
	unmuted, err := store.UnmuteAlert(ctx, rec.ID, "tester")
	if err != nil || unmuted.Status != AlertStatusActive {
		t.Fatalf("unmute: %+v err=%v", unmuted, err)
	}
	resolved, err := store.ResolveAlert(ctx, rec.ID, "tester")
	if err != nil || resolved.Status != AlertStatusResolved || resolved.ResolvedAt.IsZero() {
		t.Fatalf("resolve: %+v err=%v", resolved, err)
	}
}

func TestJSONStorePersistsAlertsAcrossReload(t *testing.T) {
	ctx := context.Background()
	dir := filepath.Join(t.TempDir(), "mother-state")
	store := NewJSONStore(Options{Engine: EngineJSON, Path: dir, SyncWrites: true, BackupOnMigration: true})
	if err := store.Open(ctx); err != nil {
		t.Fatalf("open json store: %v", err)
	}
	rec, _, err := store.UpsertAlert(ctx, AlertRecord{Scope: "rollout", Type: "config_stale", Severity: "critical", AgentID: "agent-a", Title: "stale", Message: "stale"})
	if err != nil {
		t.Fatalf("upsert alert: %v", err)
	}
	_ = store.Close()

	reloaded := NewJSONStore(Options{Engine: EngineJSON, Path: dir, SyncWrites: true, BackupOnMigration: true})
	if err := reloaded.Open(ctx); err != nil {
		t.Fatalf("reload: %v", err)
	}
	got, err := reloaded.GetAlert(ctx, rec.ID)
	if err != nil || got.Type != "config_stale" || got.AgentID != "agent-a" {
		t.Fatalf("alert did not persist: %+v err=%v", got, err)
	}
}
