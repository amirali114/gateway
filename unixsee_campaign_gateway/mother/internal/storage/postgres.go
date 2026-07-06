package storage

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// PostgresOptions describes the optional production PostgreSQL profile.
// R9.9 ships the storage contract, config surface, migrations and tooling.
// The current offline release build intentionally does not vendor a PostgreSQL
// driver; engine=postgres therefore fails safe instead of silently falling back
// to JSON or fake persistence.
type PostgresOptions struct {
	DSN                    string
	MaxOpenConns           int
	MaxIdleConns           int
	ConnMaxLifetimeSeconds int
	SSLMode                string
}

type PostgresStore struct {
	*MemoryStore
	opts       Options
	lastLoadAt time.Time
	lastError  string
}

func NewPostgresStore(opts Options) *PostgresStore {
	return &PostgresStore{MemoryStore: NewMemoryStore(), opts: opts}
}

func (s *PostgresStore) Open(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.lastLoadAt = time.Now().UTC()
	if strings.TrimSpace(s.opts.Postgres.DSN) == "" {
		s.lastError = "postgres dsn is not configured"
		return fmt.Errorf(s.lastError)
	}
	s.lastError = "postgres driver unavailable in this offline build; rebuild with pgx stdlib support before enabling storage.engine=postgres"
	return fmt.Errorf(s.lastError)
}

func (s *PostgresStore) Close() error { return nil }

func (s *PostgresStore) Health(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if s.lastError != "" {
		return fmt.Errorf(s.lastError)
	}
	return fmt.Errorf("postgres store is not open")
}

func (s *PostgresStore) StorageStatus(ctx context.Context) StorageStatus {
	ok := ctx.Err() == nil && s.lastError == ""
	lastErr := s.lastError
	if ctx.Err() != nil {
		ok = false
		lastErr = ctx.Err().Error()
	}
	return StorageStatus{
		OK:                ok,
		Engine:            EnginePostgres,
		Path:              s.opts.Path,
		Writable:          false,
		LastLoadAt:        s.lastLoadAt,
		LastError:         lastErr,
		DatabaseConnected: false,
		SchemaVersion:     0,
		MigrationStatus:   "driver_unavailable",
		DsnRedacted:       RedactDSN(s.opts.Postgres.DSN),
		PersistedObjects:  map[string]int{},
		Tables:            map[string]int{},
	}
}

func RedactDSN(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if u, err := url.Parse(raw); err == nil && u.Scheme != "" {
		if u.User != nil {
			username := u.User.Username()
			if username != "" {
				u.User = url.UserPassword(username, "xxxxx")
			} else {
				u.User = url.UserPassword("xxxxx", "xxxxx")
			}
		}
		q := u.Query()
		if q.Has("password") {
			q.Set("password", "xxxxx")
		}
		u.RawQuery = q.Encode()
		return u.String()
	}
	parts := strings.Fields(raw)
	for i, part := range parts {
		lower := strings.ToLower(part)
		if strings.HasPrefix(lower, "password=") || strings.HasPrefix(lower, "pass=") || strings.HasPrefix(lower, "pwd=") {
			kv := strings.SplitN(part, "=", 2)
			parts[i] = kv[0] + "=xxxxx"
		}
	}
	return strings.Join(parts, " ")
}
