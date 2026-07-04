# R8B — Dashboard Skeleton

R8B adds the first local/dev dashboard skeleton for Unixsee Campaign Gateway.

## Scope

The dashboard is a read-only Next.js + React + TypeScript app under:

```text
dashboard/
```

It reads from the existing Agent and Mother HTTP APIs and does not require a database.

## Why R8B exists

R8A PostgreSQL persistence is blocked until a real PostgreSQL Go driver such as `github.com/jackc/pgx/v5/stdlib` is available in the build environment. R8B moves forward on observability without faking PostgreSQL or changing runtime behavior.

## Runtime safety

R8B does not change PHP, Agent, or Mother behavior:

- PHP remains source of truth.
- Agent remains shadow-only.
- Mother remains a local/dev policy provider.
- Mother is not placed in the user request hot path.
- No Agent decisions are enforced.
- No queue, ticket, waiting room, or WordPress loading behavior changes.

## Pages

- `/` overview
- `/agents` Agent status, counters, storage engine, comparison summary, policy summary
- `/policy` Agent effective policy
- `/sync` Agent policy sync status
- `/diagnostics` comparator diagnostics
- `/mother` Mother health/readiness and debug policy endpoint status

## APIs used

Agent:

```http
GET /healthz
GET /readyz
GET /v1/stats
GET /v1/policy/effective
GET /v1/policy/sync-status
GET /v1/comparison/diagnostics
```

Mother:

```http
GET /healthz
GET /readyz
GET /v1/policies/default
GET /v1/debug/policies/default
```

The dashboard does not call write endpoints because R8B is read-only.

## Offline behavior

The API client returns safe unavailable states such as `Agent unavailable` or `Mother unavailable`. It does not crash the UI and does not use fake data.

## Security defaults

The dashboard does not include secrets, tokens, `.env`, auth, remote command buttons, or destructive actions. `.env.example` only contains local loopback URLs. From R8B.1 onward, server-only variables `UNIXSEE_AGENT_BASE_URL` and `UNIXSEE_MOTHER_BASE_URL` are preferred; legacy `NEXT_PUBLIC_*` variables remain as optional dev fallback only.

Comparator diagnostics are displayed exactly as returned by Agent. The dashboard does not request or expose cookies, sensitive headers, full payloads, IP, or User-Agent unless a future Agent API explicitly returns those fields.

## Run order for local testing

1. Run Mother.
2. Run Agent.
3. Run Dashboard.

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

## Not implemented in R8B

- auth
- policy editing
- policy assignment
- dashboard database
- PostgreSQL persistence
- billing
- remote commands
- production SaaS deployment
- charts that require historical data not exposed by existing APIs

## Next phase options

- R8A PostgreSQL persistence in an internet-enabled Go environment with `pgx/v5` available
- R8C Policy Assignment API
- R8D Installer/Test Plan


## R8B.1 hardening note

R8B.1 changes dashboard environment handling to prefer server-only API base URLs because data fetching is server-side. It also documents npm audit status and keeps the dashboard local/dev read-only. Do not expose the dashboard publicly without auth and reverse-proxy protection.


## R8B.1 dependency hygiene

R8B.1 keeps Next.js on the current dashboard major version and uses an npm `overrides.postcss` rule to address the PostCSS audit advisory without accepting an unsafe `npm audit fix --force` downgrade path. Final `npm audit` result during R8B.1 validation: `found 0 vulnerabilities`.
