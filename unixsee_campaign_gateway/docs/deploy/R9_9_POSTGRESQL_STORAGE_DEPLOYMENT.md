# R9.9 PostgreSQL Storage Deployment

## Architecture

```text
Dashboard browser -> HTTPS reverse proxy -> Dashboard 127.0.0.1:8740
Dashboard server -> Mother local/private API -> PostgreSQL
Agent client -> Mother policy/config/telemetry endpoint -> PostgreSQL
PHP Gateway -> still source of truth for request handling
```

## Required environment

Mother environment file example:

```env
UNIXSEE_MOTHER_POSTGRES_DSN=postgres://unixsee_gateway:change-me@127.0.0.1:5432/unixsee_gateway?sslmode=require
```

Keep this file outside webroot, owned by the service user/root group, with mode `0640`.

## Mother config

```yaml
storage:
  engine: "postgres"
  path: "/var/lib/unixsee-gateway/mother"
  sync_writes: true
  backup_on_migration: true
  postgres:
    dsn: "${UNIXSEE_MOTHER_POSTGRES_DSN}"
    max_open_conns: 10
    max_idle_conns: 5
    conn_max_lifetime_seconds: 300
    sslmode: "require"
```

If PostgreSQL is configured but unreachable, Mother must fail safe. Do not allow hidden fallback to JSON in production.

## Migrations

Migrations live in:

```text
mother/migrations/postgres/
```

Use the migration tool profile:

```bash
/usr/local/bin/unixsee-mother-migrate --config /etc/unixsee-campaign-gateway/mother.yml status
/usr/local/bin/unixsee-mother-migrate --config /etc/unixsee-campaign-gateway/mother.yml validate
```

Live migration requires a Mother build with a real PostgreSQL driver/profile. The offline package refuses live DB writes by default.

## Backup and restore

Examples:

```text
deploy/postgres/backup-postgres.example.sh
deploy/postgres/restore-postgres.example.sh
```

Backups must be stored outside webroot and protected with filesystem permissions.

## Validation

```bash
MOTHER_URL=http://127.0.0.1:8732 EXPECTED_ENGINE=postgres deploy/scripts/validate-postgres-storage.sh
bash deploy/scripts/check-secret-exposure.sh /opt/unixsee-campaign-gateway
```

## Rollback

- Stop Dashboard and Mother.
- Keep PostgreSQL backups intact.
- Switch Mother config back to `storage.engine: "json"` only if you intentionally choose staging fallback and have a valid JSON state.
- Never delete uploads, WordPress DB, PHP runtime, or customer data.

## Known limitations

- PostgreSQL driver-enabled build is required for live SQL operation.
- No HA clustering yet.
- Dashboard RBAC store remains local JSON in this offline package.
- Agent remains shadow-only.
