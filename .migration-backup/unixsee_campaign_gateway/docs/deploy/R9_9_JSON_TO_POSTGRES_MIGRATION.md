# R9.9 JSON to PostgreSQL Migration

## Goal

Move Mother state from R9.6/R9.7 JSON storage to the PostgreSQL production profile without losing agent registry, configs, versions, telemetry snapshots or events.

## Safe migration flow

1. Confirm current JSON storage is healthy:

```bash
curl -sS http://127.0.0.1:8732/v1/storage/status
```

2. Stop Mother cleanly.

3. Copy the JSON state file and `.bak` to a protected backup location outside webroot.

4. Prepare PostgreSQL database and run schema migrations.

5. Use a driver-enabled `unixsee-mother-migrate import-json-to-postgres --dry-run=false` build to import JSON.

6. Start Mother with `storage.engine: "postgres"`.

7. Validate:

```bash
curl -sS http://127.0.0.1:8732/v1/storage/status
curl -sS http://127.0.0.1:8732/v1/agents
curl -sS http://127.0.0.1:8732/v1/diagnostics/summary
```

## Failure behavior

If PostgreSQL cannot connect, Mother should fail startup and not silently fall back to JSON. This protects operators from unknowingly writing production state to a local staging file.

## Rollback

Rollback is configuration-level only:

- Stop Mother.
- Restore the previous JSON state file.
- Set `storage.engine: "json"`.
- Start Mother.
- Validate `/v1/storage/status`.

Do not delete PostgreSQL backups until the new deployment has been verified.
