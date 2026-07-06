-- Unixsee Campaign Gateway Mother PostgreSQL schema profile (R9.9)
-- Idempotent, non-destructive migration.

CREATE TABLE IF NOT EXISTS mother_metadata (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO mother_metadata (key, value)
VALUES ('schema_version', '1'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  last_policy_pull_at TIMESTAMPTZ,
  last_policy_profile_id TEXT NOT NULL DEFAULT '',
  last_policy_version INTEGER NOT NULL DEFAULT 0,
  last_source_ip TEXT NOT NULL DEFAULT '',
  pull_count BIGINT NOT NULL DEFAULT 0,
  stale_after_seconds INTEGER NOT NULL DEFAULT 90,
  last_telemetry_at TIMESTAMPTZ,
  telemetry_status TEXT NOT NULL DEFAULT 'missing',
  last_match_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_received BIGINT NOT NULL DEFAULT 0,
  last_mismatched BIGINT NOT NULL DEFAULT 0,
  active_config_version INTEGER NOT NULL DEFAULT 0,
  active_config_hash TEXT NOT NULL DEFAULT '',
  last_config_delivered_at TIMESTAMPTZ,
  last_config_ack_at TIMESTAMPTZ,
  acknowledged_config_version INTEGER NOT NULL DEFAULT 0,
  acknowledged_config_hash TEXT NOT NULL DEFAULT '',
  config_sync_status TEXT NOT NULL DEFAULT 'missing',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_configs (
  agent_id TEXT PRIMARY KEY REFERENCES agents(agent_id) ON DELETE CASCADE,
  active_version INTEGER NOT NULL DEFAULT 0,
  active_config_hash TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_config_drafts (
  agent_id TEXT PRIMARY KEY,
  base_version INTEGER NOT NULL DEFAULT 0,
  config_hash TEXT NOT NULL,
  config JSONB NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'valid',
  updated_by TEXT NOT NULL DEFAULT 'dashboard',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_config_versions (
  agent_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_hash TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'dashboard',
  published_by TEXT NOT NULL DEFAULT '',
  rollback_by TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  source TEXT NOT NULL,
  rollback_from_version INTEGER,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  PRIMARY KEY (agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_config_versions_agent_created ON agent_config_versions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_config_versions_status ON agent_config_versions(status);

CREATE TABLE IF NOT EXISTS agent_telemetry_latest (
  agent_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remote_addr TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_events (
  agent_id TEXT NOT NULL,
  id BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (agent_id, id)
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_timestamp ON agent_events(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(type);
