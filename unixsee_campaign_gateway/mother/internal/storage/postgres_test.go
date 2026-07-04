package storage

import (
	"context"
	"strings"
	"testing"
)

func TestRedactDSN(t *testing.T) {
	redacted := RedactDSN("postgres://user:very-secret@example.internal:5432/db?sslmode=require")
	if strings.Contains(redacted, "very-secret") {
		t.Fatalf("dsn password leaked: %s", redacted)
	}
	if !strings.Contains(redacted, "xxxxx") || !strings.Contains(redacted, "example.internal") {
		t.Fatalf("unexpected redacted dsn: %s", redacted)
	}
}

func TestPostgresStoreFailsSafeWithoutDriver(t *testing.T) {
	store := NewPostgresStore(Options{Engine: EnginePostgres, Path: "/var/lib/unixsee-gateway/mother", Postgres: PostgresOptions{DSN: "postgres://user:secret@example.internal:5432/db?sslmode=require"}})
	err := store.Open(context.Background())
	if err == nil || !strings.Contains(err.Error(), "driver unavailable") {
		t.Fatalf("expected fail-safe driver unavailable error, got %v", err)
	}
	st := store.StorageStatus(context.Background())
	if st.Engine != EnginePostgres || st.OK || st.DatabaseConnected || strings.Contains(st.DsnRedacted, "secret") {
		t.Fatalf("unexpected postgres status: %+v", st)
	}
}
