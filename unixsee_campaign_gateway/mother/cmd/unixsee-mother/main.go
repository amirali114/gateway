package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"unixsee-campaign-gateway/mother/internal/config"
	"unixsee-campaign-gateway/mother/internal/logger"
	"unixsee-campaign-gateway/mother/internal/server"
	"unixsee-campaign-gateway/mother/internal/storage"
)

func main() {
	configPath := flag.String("config", "./configs/mother.example.yml", "path to mother yaml config")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		_, _ = os.Stderr.WriteString("config error: " + err.Error() + "\n")
		os.Exit(1)
	}
	log, err := logger.New(cfg.Logging.Path, cfg.Logging.Level)
	if err != nil {
		_, _ = os.Stderr.WriteString("logger error: " + err.Error() + "\n")
		os.Exit(1)
	}
	defer func() { _ = log.Close() }()
	log.Info("config_loaded", cfg.SafeSummary())

	store, err := storage.NewStore(storage.Options{Engine: cfg.Storage.Engine, Path: cfg.Storage.Path, SyncWrites: cfg.Storage.SyncWrites, BackupOnMigration: cfg.Storage.BackupOnMigration, Postgres: storage.PostgresOptions{DSN: cfg.Storage.Postgres.DSN, MaxOpenConns: cfg.Storage.Postgres.MaxOpenConns, MaxIdleConns: cfg.Storage.Postgres.MaxIdleConns, ConnMaxLifetimeSeconds: cfg.Storage.Postgres.ConnMaxLifetimeSeconds, SSLMode: cfg.Storage.Postgres.SSLMode}})
	if err != nil {
		log.Error("storage_factory_failed", map[string]any{"error": err.Error(), "storage_engine": cfg.Storage.Engine})
		os.Exit(1)
	}
	if err := store.Open(context.Background()); err != nil {
		log.Error("storage_open_failed", map[string]any{"error": err.Error(), "storage_engine": cfg.Storage.Engine})
		os.Exit(1)
	}
	defer func() { _ = store.Close() }()
	log.Info("storage_opened", map[string]any{"storage_engine": cfg.Storage.Engine, "storage_path": cfg.Storage.Path})

	srv := server.New(cfg, log, store)
	errCh := make(chan error, 1)
	go func() { errCh <- srv.Start() }()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		log.Info("signal_received", map[string]any{"signal": sig.String()})
	case err := <-errCh:
		if err != nil {
			log.Error("mother_failed", map[string]any{"error": err.Error()})
			os.Exit(1)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("mother_shutdown_failed", map[string]any{"error": err.Error()})
		os.Exit(1)
	}
	log.Info("mother_stopped", nil)
}
