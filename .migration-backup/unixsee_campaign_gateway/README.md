# Unixsee Campaign Gateway

Unixsee Campaign Gateway is currently split into:

- PHP Gateway: production request/queue/ticket/waiting-room runtime and source of truth
- Go Agent: local shadow observer, policy consumer, comparator, diagnostics provider
- Go Mother: local/dev policy provider skeleton
- Dashboard: local/dev read-only dashboard skeleton

PHP remains the source of truth. Agent decisions are shadow-only and non-enforcing.

## R8B Dashboard Skeleton

R8B adds a Next.js + React + TypeScript dashboard under:

```text
dashboard/
```

It reads existing Agent and Mother APIs and does not require a database.

Run locally:

```bash
cd mother
./scripts/run-local.sh

cd ../agent
./scripts/run-local.sh

cd ../dashboard
npm ci
npm run dev
```

Open:

```text
http://127.0.0.1:8740
```

The dashboard is read-only. It does not edit policy, run remote commands, add billing, or change PHP behavior.

R8A PostgreSQL persistence remains blocked until a real PostgreSQL Go driver such as `github.com/jackc/pgx/v5/stdlib` is available in the build environment. No fake PostgreSQL storage is included.


## R8B.1 Dashboard Env Hardening

Dashboard API base URLs now prefer server-only variables:

```env
UNIXSEE_AGENT_BASE_URL=http://127.0.0.1:8731
UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732
```

Legacy `NEXT_PUBLIC_UNIXSEE_AGENT_BASE_URL` and `NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL` remain supported only as local/dev fallback. The dashboard is read-only and must not be exposed publicly without auth/reverse-proxy protection.

## R8C.2 Dashboard Policy Assignment Read-Only View

R9.1 adds a Mother-backed staging control plane: Agent registry, per-Agent detail pages, Gateway draft/publish controls, and config history.

The Dashboard reads:

```text
GET /v1/policies
GET /v1/policies/default
GET /v1/agents/{agent_id}/policy-assignment
GET /v1/debug/policies/default
```

It does not add policy write UI, assignment forms, remote commands, enforcement, auth, billing, or PostgreSQL persistence. PHP remains the source of truth and the Agent remains shadow-only.

## R8D Installer and Staging Test Plan

R8D adds safe local/dev release engineering helpers under `install/` and deployment documentation under `docs/deploy/`.

Quick validation:

```bash
bash install/validate-package.sh
bash install/run-smoke-test.sh
```

Dry-run installer:

```bash
bash install/install-local-dev.sh
```

Apply only on a backup/staging server after review:

```bash
bash install/install-local-dev.sh --apply --prefix /opt/unixsee-campaign-gateway --build --system-user --systemd --dashboard
```

R8D does not modify DirectAdmin/OpenLiteSpeed, WordPress, `public_html`, `.htaccess`, cron, sudoers, or production services automatically. PHP remains the source of truth, the Agent remains shadow-only, Mother remains local/dev, and the Dashboard remains read-only.

## R9.1 Mother-backed control plane

R9.1 adds Mother-backed Agent registry and staged Gateway config draft/publish APIs, plus Dashboard pages for real Agents and Gateway control. PHP Gateway remains the request-handling source of truth and Agent remains shadow-only. No PostgreSQL, remote commands, or direct site writes are added.

## R9.2 Product Dashboard RTL Control Plane

R9.2 adds a Persian RTL Mother-backed staging control plane. Dashboard production pages use Mother APIs only, support Agent registry, per-agent config draft/publish, Gateway control, policies, diagnostics placeholders, and Mother settings. PHP Gateway remains source of truth and Agent remains shadow-only.

## R9.3 Mother Agent Telemetry Diagnostics

R9.3 adds Agent-to-Mother telemetry push, Mother-side diagnostics aggregation, per-Agent event buffers, and Persian RTL dashboard visibility for telemetry health, shadow counters, match rate, received payloads, mismatches, and recent events.

Dashboard production pages still use Mother APIs only. Agent remains shadow-only, PHP remains the runtime source of truth, PostgreSQL is not added, and no remote commands or direct site writes are introduced.

## R9.4 access-control note

R9.4 adds dashboard login/session handling and Mother management API token protection. Dashboard write calls are server-side only and must use `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` when Mother `management.api_token` is configured.

## R9.5 HTTPS deployment profile

R9.5 adds safe reverse-proxy deployment profiles under `deploy/`. Dashboard should remain on `127.0.0.1:8740` and be exposed only through HTTPS reverse proxy with authentication enabled. Mother remains internal unless remote Agents require access through a firewall-restricted path. Agent must never be public.

## R9.6 persistent Mother storage

R9.6 adds staging-grade persistent local Mother storage using atomic JSON files. PostgreSQL is still intentionally not included. Configure Mother with `storage.engine: "json"` and keep the storage path outside webroot, preferably `/var/lib/unixsee-gateway/mother`.

## R9.7 config rollout

R9.7 adds immutable per-agent config versions, draft/active diff, publish history, rollback, delivery tracking, and telemetry acknowledgement. The Agent remains shadow-only and PHP Gateway remains the runtime source of truth.

## R9.8 Dashboard RBAC

The Dashboard now uses local multi-user RBAC with a persistent JSON user store and JSONL audit trail. PHP remains the runtime source of truth and Agent remains shadow-only. The Dashboard writes only to Mother APIs and never writes to site files.

See:

- `docs/refactor/R9_8_DASHBOARD_RBAC_OPERATOR_AUDIT.md`
- `docs/deploy/R9_8_DASHBOARD_RBAC_DEPLOYMENT.md`

## R9.9 PostgreSQL production storage profile

R9.9 adds an optional PostgreSQL storage profile for Mother with schema migrations, safe deployment examples and validation scripts. JSON storage remains the staging fallback. PostgreSQL is not mandatory and must be explicitly configured. The release never silently falls back from PostgreSQL to JSON and never logs DB passwords or full DSNs.

See:

- `docs/refactor/R9_9_POSTGRESQL_PRODUCTION_STORAGE_PROFILE.md`
- `docs/deploy/R9_9_POSTGRESQL_STORAGE_DEPLOYMENT.md`
- `docs/deploy/R9_9_JSON_TO_POSTGRES_MIGRATION.md`

## R10.0 production readiness controlled rollout

R10.0 focuses on operational deployment readiness, not new enforcement features.

Current architecture:

```text
Client/Site server:
  public webroot: /unixsee-gateway/gateway.php only
  private PHP runtime: outside webroot
  Agent: 127.0.0.1:8731, shadow-only

Core/Mother server:
  Mother API: 127.0.0.1:8732 by default
  Dashboard: 127.0.0.1:8740 by default
  HTTPS reverse proxy exposes Dashboard only
```

Standard paths:

```text
/opt/unixsee-campaign-gateway/unixsee_campaign_gateway
/etc/unixsee-gateway/mother.yml
/etc/unixsee-gateway/mother.env
/etc/unixsee-gateway/dashboard.env
/var/lib/unixsee-gateway/mother
/var/lib/unixsee-gateway/dashboard
/var/log/unixsee-gateway
```

Key validation:

```bash
DRY_RUN=1 deploy/scripts/install-core.sh
DRY_RUN=1 deploy/scripts/update-core.sh
deploy/scripts/validate-production-readiness.sh
```

Supported storage engines:

- `json`: staging-grade persistent local storage
- `postgres`: optional production profile when a real driver-enabled build is available

Supported Dashboard roles:

- owner
- admin
- operator
- viewer

Production warnings:

- Agent remains shadow-only.
- Enforcement is not enabled.
- Dashboard must be public only behind HTTPS/reverse proxy and auth.
- Mother remote exposure requires firewall restrictions.
- No remote command execution exists.

See:

- `docs/deploy/R10_0_PRODUCTION_READINESS_CHECKLIST.md`
- `docs/deploy/R10_0_CONTROLLED_ROLLOUT_RUNBOOK.md`
- `docs/deploy/R10_0_INSTALLATION.md`
- `docs/deploy/R10_0_UPGRADE.md`
- `docs/deploy/R10_0_ROLLBACK.md`
- `docs/deploy/R10_0_SECURITY_MODEL.md`
- `docs/refactor/R10_0_PRODUCTION_READINESS_CONTROLLED_ROLLOUT.md`


## R10.1 First Real Staging Deployment Cleanup

R10.1 prepares the package for first real staging deployment. Public PHP is now wrapper-only (`deploy/php-wrapper/gateway.php`), while private PHP runtime remains outside webroot. Standard runtime paths are `/opt/unixsee-campaign-gateway`, `/etc/unixsee-gateway`, `/var/lib/unixsee-gateway`, and `/var/log/unixsee-gateway`.

Use `deploy/scripts/validate-source-release.sh` for clean ZIP/source checks and `deploy/scripts/validate-installed-runtime.sh` for built server installations. PostgreSQL remains optional/profile/fail-safe unless a driver-enabled build is explicitly provided; JSON storage is the staging fallback. Agent remains shadow-only, enforcement is disabled, and no remote command execution exists.

## R10.2 — Observability / Alerting / Runtime Health

R10.2 adds internal alerting and safe health reporting for the first staging deployments.

New operational surfaces:

- Mother API: `/v1/alerts`, `/v1/alerts/summary`, `/v1/health/report`
- Dashboard: `/alerts` Persian RTL alert center
- Scripts: `deploy/scripts/validate-observability.sh`, `deploy/scripts/collect-health-report.sh`
- Config: `alerts.enabled`, `alerts.evaluation_interval_seconds`, `alerts.stale_after_seconds`, `alerts.critical_stale_after_seconds`, `alerts.max_alerts`

R10.2 is observability-only. Alerts do not enable enforcement, do not run remote commands and do not expose the Agent publicly.

## R10.3 controlled beta staging hardening

R10.3 prepares the cleaned R10.2 observability package for a first limited beta-style staging deployment. It adds operational release gates, a Persian RTL `/release` Dashboard page, release evidence collection, backup/restore drill wrappers, public exposure hardening checks, shadow-only safety validation, controlled rollout simulation, and beta incident response docs.

Safety remains unchanged:

- PHP Gateway is still the runtime source of truth.
- Agent is still shadow-only and local-only by default.
- Enforcement is not enabled and no enforcement UI exists.
- No remote command execution exists.
- Public PHP Gateway remains wrapper-only; private runtime stays outside webroot.
- Dashboard uses Mother APIs only and never exposes the Mother management token to the browser.
- PostgreSQL remains optional; JSON storage remains staging-grade fallback.

New operator entry points:

- Dashboard: `/release` — آمادگی انتشار
- Mother API: `/v1/release-gates`, `/v1/release-gates/summary`
- Scripts: `collect-release-evidence.sh`, `drill-backup-restore-core.sh`, `drill-backup-restore-client.sh`, `simulate-controlled-rollout.sh`, `validate-shadow-only-safety.sh`, `validate-public-exposure-hardening.sh`
- Docs: `docs/deploy/R10_3_BETA_OPERATOR_CHECKLIST.md`, `docs/deploy/R10_3_INCIDENT_RESPONSE_RUNBOOK.md`, `docs/deploy/R10_3_RELEASE_EVIDENCE_COLLECTION.md`, `docs/deploy/R10_3_BACKUP_RESTORE_DRILLS.md`
