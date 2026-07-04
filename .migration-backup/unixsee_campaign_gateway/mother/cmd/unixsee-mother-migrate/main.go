package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/storage"
)

type statusOutput struct {
	OK                 bool     `json:"ok"`
	Command            string   `json:"command"`
	StorageEngine      string   `json:"storage_engine"`
	PostgresConfigured bool     `json:"postgres_configured"`
	DSNRedacted        string   `json:"dsn_redacted,omitempty"`
	MigrationFiles     []string `json:"migration_files"`
	Message            string   `json:"message"`
}

func main() {
	configPath := flag.String("config", "./configs/mother.example.yml", "path to mother yaml config")
	migrationsDir := flag.String("migrations", "./migrations/postgres", "path to postgres migrations")
	dryRun := flag.Bool("dry-run", true, "dry-run mode for import/migrate operations")
	flag.Parse()
	cmd := "status"
	if flag.NArg() > 0 {
		cmd = strings.TrimSpace(flag.Arg(0))
	}
	cfg, err := config.Load(*configPath)
	if err != nil {
		fail(statusOutput{OK: false, Command: cmd, Message: "config error: " + err.Error()})
	}
	files := migrationFiles(*migrationsDir)
	out := statusOutput{OK: true, Command: cmd, StorageEngine: cfg.Storage.Engine, PostgresConfigured: strings.TrimSpace(cfg.Storage.Postgres.DSN) != "", DSNRedacted: storage.RedactDSN(cfg.Storage.Postgres.DSN), MigrationFiles: files}

	switch cmd {
	case "status":
		out.Message = "migration profile available; live database status requires a Mother binary built with a PostgreSQL driver"
		printJSON(out)
	case "validate":
		if cfg.Storage.Engine == storage.EnginePostgres && strings.TrimSpace(cfg.Storage.Postgres.DSN) == "" {
			fail(statusOutput{OK: false, Command: cmd, StorageEngine: cfg.Storage.Engine, Message: "postgres engine configured without DSN"})
		}
		if len(files) == 0 {
			fail(statusOutput{OK: false, Command: cmd, StorageEngine: cfg.Storage.Engine, Message: "no postgres migration files found"})
		}
		out.Message = "config and migration files validated; no secrets printed"
		printJSON(out)
	case "migrate":
		if *dryRun {
			out.Message = "dry-run only: migrations would be applied in filename order by a driver-enabled build"
			printJSON(out)
			return
		}
		fail(statusOutput{OK: false, Command: cmd, StorageEngine: cfg.Storage.Engine, DSNRedacted: out.DSNRedacted, MigrationFiles: files, Message: "live migrate requires a driver-enabled production build; this offline package refuses to run destructive database operations"})
	case "export-json":
		out.Message = "export-json is documented for deployment; use existing JSON state file backup/copy while Mother is stopped or after a clean snapshot"
		printJSON(out)
	case "import-json-to-postgres":
		if *dryRun {
			out.Message = "dry-run only: JSON would be validated and imported by a driver-enabled build"
			printJSON(out)
			return
		}
		fail(statusOutput{OK: false, Command: cmd, StorageEngine: cfg.Storage.Engine, DSNRedacted: out.DSNRedacted, Message: "import requires a driver-enabled production build"})
	default:
		fail(statusOutput{OK: false, Command: cmd, Message: "unsupported command; use status, migrate, export-json, import-json-to-postgres, or validate"})
	}
}

func migrationFiles(dir string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	out := []string{}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		out = append(out, filepath.ToSlash(filepath.Join(dir, entry.Name())))
	}
	sort.Strings(out)
	return out
}

func printJSON(v statusOutput) {
	b, _ := json.MarshalIndent(v, "", "  ")
	fmt.Println(string(b))
}

func fail(v statusOutput) {
	printJSON(v)
	os.Exit(1)
}
