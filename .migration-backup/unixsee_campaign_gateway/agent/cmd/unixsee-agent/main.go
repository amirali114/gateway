package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"unixsee-campaign-gateway/agent/internal/config"
	"unixsee-campaign-gateway/agent/internal/logger"
	"unixsee-campaign-gateway/agent/internal/server"
	"unixsee-campaign-gateway/agent/internal/stats"
	"unixsee-campaign-gateway/agent/internal/storage"
)

func mergePolicyStatus(fields map[string]any, status string, errText string) map[string]any {
	if fields == nil {
		fields = map[string]any{}
	}
	fields["policy_status"] = status
	if errText != "" {
		fields["policy_error"] = errText
	}
	return fields
}

func main() {
	configPath := flag.String("config", "./configs/agent.example.yml", "path to agent yaml config")
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
	log.Info("policy_loaded", mergePolicyStatus(cfg.Policy.SafeLogFields(), cfg.PolicyStatus, cfg.PolicyError))

	store, err := storage.NewStore(storage.Options{
		Engine:     cfg.Storage.Engine,
		Path:       cfg.Storage.Path,
		SyncWrites: cfg.Storage.SyncWrites,
	})
	if err != nil {
		log.Error("storage_factory_failed", map[string]any{"error": err.Error(), "storage_engine": cfg.Storage.Engine, "storage_path": cfg.Storage.Path})
		os.Exit(1)
	}
	if err := store.Open(context.Background()); err != nil {
		log.Error("storage_open_failed", map[string]any{"error": err.Error(), "storage_engine": cfg.Storage.Engine, "storage_path": cfg.Storage.Path})
		os.Exit(1)
	}
	defer func() { _ = store.Close() }()
	log.Info("storage_opened", map[string]any{"storage_engine": cfg.Storage.Engine, "storage_path": cfg.Storage.Path, "sync_writes": cfg.Storage.SyncWrites})

	counters := stats.NewWithDiagnostics(stats.DiagnosticsConfig{
		Enabled:                cfg.Diagnostics.Enabled,
		RecentMismatchLimit:    cfg.Diagnostics.RecentMismatchLimit,
		ExposeRecentMismatches: cfg.Diagnostics.ExposeRecentMismatches,
		IncludeUserAgent:       cfg.Diagnostics.IncludeUserAgent,
		IncludeIP:              cfg.Diagnostics.IncludeIP,
	})
	srv := server.New(cfg, log, store, counters)

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		log.Info("signal_received", map[string]any{"signal": sig.String()})
	case err := <-errCh:
		if err != nil {
			log.Error("server_failed", map[string]any{"error": err.Error()})
			os.Exit(1)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("server_shutdown_failed", map[string]any{"error": err.Error()})
		os.Exit(1)
	}
	log.Info("agent_stopped", nil)
}
