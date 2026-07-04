# R9.9 PostgreSQL Production Storage Profile

R9.9 adds an optional PostgreSQL production storage profile for Mother while preserving the R9.6 JSON store as the staging fallback.

## Summary

Added:

- Mother config surface for `storage.engine=postgres`
- PostgreSQL schema migrations under `mother/migrations/postgres/`
- migration/profile CLI under `mother/cmd/unixsee-mother-migrate`
- deployment examples under `deploy/postgres/`
- storage status fields for database/schema/migration health
- dashboard settings/diagnostics visibility for PostgreSQL status
- validation scripts for PostgreSQL and secret exposure checks

## Storage architecture

Supported engines:

| Engine | Purpose | Persistence | Notes |
|---|---|---|---|
| `json` | staging fallback | local atomic JSON | default safe staging profile |
| `postgres` | production profile | SQL schema | optional; requires driver-enabled production build |
| `memory` | throwaway dev | volatile | not for staging/production |

The offline release environment could not fetch a public PostgreSQL Go driver. Therefore this package includes the config, schema, migrations, documentation and fail-safe profile, but `storage.engine=postgres` refuses to start unless rebuilt with a real driver-enabled build. It does not silently fall back to JSON and does not fake PostgreSQL persistence.

## Tables

Migrations define:

- `mother_metadata`
- `agents`
- `agent_configs`
- `agent_config_drafts`
- `agent_config_versions`
- `agent_telemetry_latest`
- `agent_events`

The schema persists agent registry, active/draft configs, immutable versions, rollback metadata, delivery/ack state, latest telemetry and events.

## Security model

- No PostgreSQL password or full DSN is logged or returned.
- `/v1/storage/status` returns `dsn_redacted` only.
- JSON fallback remains supported and should stay outside webroot.
- Dashboard browser still never receives the Mother management token.
- PHP remains request-handling source of truth and Agent remains shadow-only.

## Automated validation summary

Run before release:

```bash
php tools/uxgw_selftest.php
php tools/uxgw_release_scan.php
cd mother && go test ./... && go build ./cmd/unixsee-mother && go build ./cmd/unixsee-mother-migrate
cd dashboard && npm ci && npm run build
bash deploy/scripts/check-secret-exposure.sh .
```

PostgreSQL integration tests are skipped unless a test DB and driver-enabled build are available.

## Remaining limitations

- PostgreSQL is optional and not required for staging.
- This offline package includes fail-safe profile/migrations but not a vendored PostgreSQL driver.
- No HA clustering yet.
- No SSO/OAuth yet.
- No 2FA yet.
- Agent remains shadow-only.
- Full production enforcement is still not enabled.
