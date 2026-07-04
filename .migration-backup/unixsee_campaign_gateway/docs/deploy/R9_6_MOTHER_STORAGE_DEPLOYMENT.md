# R9.6 Mother Storage Deployment

This document describes staging deployment for the persistent local Mother storage engine introduced in R9.6.

## Recommended path

Use a private runtime directory outside webroot:

```text
/var/lib/unixsee-gateway/mother
```

Recommended permissions:

```text
owner: unixsee
 group: unixsee
  mode: 0750
```

Do not store `mother-state.json` under a public website, `public_html`, document root, or downloadable directory.

## Example config

```yaml
storage:
  engine: "json"
  path: "/var/lib/unixsee-gateway/mother"
  sync_writes: true
  backup_on_migration: true
```

`memory` can still be used for throwaway local tests only.

## Systemd notes

The R9.6 systemd example includes:

```ini
ExecStartPre=/usr/bin/install -d -o unixsee -g unixsee -m 0750 /var/lib/unixsee-gateway/mother
ReadWritePaths=/var/lib/unixsee-gateway/mother /var/log/unixsee-mother
```

This allows Mother to persist state while keeping `ProtectSystem=full`.

## Validation

Run:

```bash
deploy/scripts/validate-mother-persistence.sh
```

Optional safe test mode can create and publish a dummy config through Mother API:

```bash
TEST_MODE=1 UNIXSEE_MOTHER_MANAGEMENT_TOKEN=... deploy/scripts/validate-mother-persistence.sh
```

The script is non-destructive by default and does not touch WordPress, public_html, OpenLiteSpeed, or DirectAdmin configuration.

## Restart validation

For staging, after creating a draft/published config and receiving telemetry:

1. Stop Mother.
2. Start Mother.
3. Check `/v1/storage/status`.
4. Check `/v1/agents`.
5. Check `/v1/agents/{agent_id}/config/history`.
6. Check `/v1/agents/{agent_id}/telemetry`.

State should survive restart when the JSON engine is configured.

## Rollback

1. Stop Mother.
2. Switch `storage.engine` back to `memory` only for temporary diagnosis, or restore the previous `mother-state.json.bak`.
3. Restart Mother.
4. Do not delete WordPress uploads or database.
5. Do not remove public Gateway wrapper unless explicitly rolling back PHP deployment.

## Known limitations

- PostgreSQL is still not added.
- JSON storage is local-node storage, not HA storage.
- Event retention remains bounded.
- Full backup/restore automation is not implemented yet.
