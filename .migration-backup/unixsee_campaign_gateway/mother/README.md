# Unixsee Mother/Core Service

This is the R7 local/dev Mother/Core skeleton for Unixsee Campaign Gateway.

Mother currently acts as a local policy provider for the Go Agent. It is not a production SaaS controller yet, does not send remote commands, and is not in the user request hot path.

## Endpoints

```http
GET /healthz
GET /readyz
GET /v1/agents/{agent_id}/policy
GET /v1/policies
GET /v1/policies/{policy_id}
GET /v1/debug/policies/default
```

Default bind address:

```text
127.0.0.1:8732
```

Remote bind is refused unless `security.allow_remote_bind=true`.

## Build and run

```bash
cd mother
./scripts/build.sh
./scripts/run-local.sh
```

Check:

```bash
curl http://127.0.0.1:8732/healthz
curl http://127.0.0.1:8732/readyz
curl http://127.0.0.1:8732/v1/agents/local-dev-agent/policy
```

## Config

See:

```text
configs/mother.example.yml
```

Default storage engine is `memory`. PostgreSQL is not implemented in R7. If selected, Mother fails clearly with:

```text
mother storage engine postgres is not implemented in R7
```

## HMAC

Set the same secret on Agent and Mother for signed policy pulls.

Mother:

```yaml
security:
  agent_shared_secret: "change-me"
  require_signature: true
```

Agent:

```yaml
mother:
  shared_secret: "change-me"
```

The Agent signs:

```text
GET
/v1/agents/<agent_id>/policy
<unix_timestamp>
```

## Safety

Mother only provides policy for Agent shadow decisions. PHP remains source of truth and production behavior is unchanged.

## R7.1 hardening notes

### Agent identity header

For `GET /v1/agents/{agent_id}/policy`, if `X-Unixsee-Agent-ID` is present it must match the path `{agent_id}`. When `security.require_signature=true`, the header is mandatory.

### HMAC canonical string

Mother validates signatures over:

```text
GET
/v1/agents/<agent_id>/policy
<unix_timestamp>
```

Timestamp skew defaults to 300 seconds:

```yaml
security:
  signature_max_skew_seconds: 300
```

Allowed range is 30 to 3600 seconds.

### Debug policy endpoint

`GET /v1/policies/default` is now the normal management read endpoint for policy ID `default`.

`GET /v1/debug/policies/default` is the debug-only endpoint and is disabled by default:

```yaml
debug:
  enabled: false
```

Enable it only for trusted local development. If `security.require_signature=true`, the debug endpoint also requires a valid signature.

## R8C local/dev policy management API

Mother now exposes read-only management endpoints by default:

```http
GET /v1/policies
GET /v1/policies/{policy_id}
GET /v1/agents/{agent_id}/policy-assignment
```

Write endpoints exist but are disabled by default:

```yaml
management:
  enabled: true
  write_enabled: false
```

When `management.write_enabled=false`, POST/PUT/DELETE management requests return `403` with `management writes are disabled`.

Enable writes only for trusted local/dev testing:

```yaml
management:
  enabled: true
  write_enabled: true
```

Create or update policy payloads are validated before they enter memory storage. Assignments are also validated so a missing policy cannot be assigned to an Agent.

PostgreSQL is still not implemented in this package; do not configure `storage.engine=postgres` until R8A is completed in a pgx-enabled build environment.

## R8D staging install notes

R8D adds local/dev install examples under `../install/examples/mother.local.yml` and systemd templates under `../install/systemd/`.

The example keeps Mother bound to `127.0.0.1:8732`, uses memory storage, keeps debug disabled by default, and keeps management writes disabled by default. Mother remains a local/dev policy provider and is not in the user request hot path.

## R9.1 Agent registry and control-plane config

Mother now tracks Agents when they pull policy. Use:

```bash
curl http://127.0.0.1:8732/v1/agents
curl http://127.0.0.1:8732/v1/agents/iran-staging-agent
```

Draft and publish endpoints are local/dev staging controls. They write only to Mother memory state and do not edit PHP files, WordPress, OpenLiteSpeed, or DirectAdmin configuration.

```bash
curl -X POST http://127.0.0.1:8732/v1/agents/iran-staging-agent/config/draft \
  -H 'Content-Type: application/json' \
  --data '{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}'

curl -X POST http://127.0.0.1:8732/v1/agents/iran-staging-agent/config/publish
```

`management.write_enabled` must be enabled for draft/publish writes. Agent remains shadow-only and PHP remains the runtime source of truth.

## R9.3 telemetry and diagnostics

Mother now accepts Agent telemetry without exposing the Agent publicly:

```http
POST /v1/agents/{agent_id}/telemetry
GET /v1/agents/{agent_id}/telemetry
GET /v1/agents/{agent_id}/diagnostics
GET /v1/agents/{agent_id}/events
GET /v1/diagnostics/summary
```

Telemetry uses the same Agent identity and optional HMAC headers as policy pull. If `security.require_signature=true`, unsigned telemetry is rejected.

Mother keeps latest telemetry per Agent and a bounded in-memory event ring buffer. This is operational visibility only. PostgreSQL persistence is still not implemented and Agent decisions remain shadow-only.

## R9.4 management API token

When management writes are enabled, configure an API token for write endpoints:

```yaml
management:
  enabled: true
  write_enabled: true
  api_token: "replace-with-staging-token"
```

Write requests must include `Authorization: Bearer <token>`. The token is never returned in responses and must not be logged. If `write_enabled=true` and `api_token` is empty, Mother allows explicit local/dev usage and logs a warning once.

## R9.5 bind and firewall profile

Mother defaults to local-only. For direct remote Agent access, explicitly bind to `0.0.0.0:8732`, set `security.allow_remote_bind=true`, require Agent signatures, and firewall the port to trusted Agent or proxy egress IPs only. Management write endpoints remain token-protected.

## R9.6 persistent local storage

Mother supports a staging-grade JSON storage engine for durable local state:

```yaml
storage:
  engine: "json"
  path: "/var/lib/unixsee-gateway/mother"
  sync_writes: true
  backup_on_migration: true
```

The JSON engine persists agent registry, configs, config history, telemetry snapshots, and event buffers. Runtime state must stay outside webroot. The `memory` engine is still available for throwaway local development only.

Check status:

```bash
curl http://127.0.0.1:8732/v1/storage/status
```

## R9.7 versioned config rollout

Mother stores per-agent immutable config versions, draft state, active version pointers, config hashes, delivery timestamps, telemetry acknowledgement, and rollback metadata. Rollback creates a new version from a previous version and never mutates old config objects.

## R9.9 optional PostgreSQL storage profile

Mother keeps `json` storage as the safe staging default. R9.9 adds the PostgreSQL production profile surface, schema migrations and migration tooling:

```yaml
storage:
  engine: "postgres"
  path: "/var/lib/unixsee-gateway/mother"
  postgres:
    dsn: "${UNIXSEE_MOTHER_POSTGRES_DSN}"
    max_open_conns: 10
    max_idle_conns: 5
    conn_max_lifetime_seconds: 300
    sslmode: "require"
```

The offline release build does not vendor a PostgreSQL Go driver. If `engine=postgres` is selected without a driver-enabled production build, Mother fails safe and does not fall back to JSON. The DSN is redacted in summaries/status.

Migrations live in `mother/migrations/postgres/`. The helper binary is `unixsee-mother-migrate`.
