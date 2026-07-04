# R9.6 Persistent Mother Storage Hardening

R9.6 replaces the main operational weakness of the Mother service: volatile in-memory state. The PHP Gateway remains the runtime source of truth, and the Go Agent remains shadow-only. No enforcement, remote shell execution, direct site writes, PostgreSQL, or public Agent exposure is added.

## What changed

Mother now supports a durable local JSON storage engine:

```yaml
storage:
  engine: "json"
  path: "/var/lib/unixsee-gateway/mother"
  sync_writes: true
  backup_on_migration: true
```

The existing `memory` engine remains available for throwaway local tests, but staging deployments should use `json` outside webroot.

Persisted state includes:

- Agent registry
- Active config per Agent
- Draft config per Agent
- Config history per Agent
- Latest telemetry per Agent
- Per-Agent event ring buffer
- Mother storage metadata and storage version

## Storage layout

For JSON storage, the configured `storage.path` is treated as a directory unless a `.json` path is provided. The default file inside the directory is:

```text
mother-state.json
```

Runtime files may include:

```text
mother-state.json
mother-state.json.bak
mother-state.json.tmp
```

These are runtime files and must never be placed under webroot or included in release ZIPs.

## Atomic writes

The JSON engine writes state safely by:

1. Encoding the full state snapshot.
2. Writing to a temporary file.
3. Syncing the file when `sync_writes=true`.
4. Renaming the temp file atomically.
5. Keeping a `.bak` copy of the previous good state when `backup_on_migration=true`.

If the primary state file is corrupt, Mother attempts to load the `.bak` file. If both are unavailable or corrupt, Mother fails safe at startup instead of silently losing state.

## New endpoint

```http
GET /v1/storage/status
```

Returns:

```json
{
  "ok": true,
  "engine": "json",
  "path": "/var/lib/unixsee-gateway/mother",
  "writable": true,
  "last_load_at": "...",
  "last_save_at": "...",
  "last_error": "",
  "persisted_objects": {
    "agents": 1,
    "active_configs": 1,
    "draft_configs": 0,
    "history_items": 1,
    "telemetry": 1,
    "events": 4
  }
}
```

`/readyz` also includes `storage_engine` as a non-breaking field.

## Dashboard changes

The Persian RTL Dashboard now shows Mother storage status in:

- `/settings`
- `/diagnostics`

It displays engine, path, writable status, last load/save, last error, and warns when the engine is volatile/in-memory.

## Safety model

- PHP Gateway remains runtime source of truth.
- Agent remains shadow-only.
- Dashboard uses Mother APIs only.
- Dashboard does not write to site files.
- Mother storage path must remain outside webroot.
- No PostgreSQL is added in R9.6.

## Automated validation summary

R9.6 validation includes PHP lint/self-test, Go tests/builds, Dashboard `npm ci` and production build, storage persistence tests, release scan, and runtime artifact cleanup.

## Limitations

- PostgreSQL is still not added.
- Multi-user RBAC is still not added.
- Agent remains shadow-only.
- Long-term event retention remains bounded by the per-Agent ring buffer.
- This is staging-grade persistent local storage, not HA storage.
