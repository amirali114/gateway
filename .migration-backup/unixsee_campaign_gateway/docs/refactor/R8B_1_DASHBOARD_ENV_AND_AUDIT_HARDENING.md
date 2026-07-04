# R8B.1 — Dashboard Env and Audit Hardening

R8B.1 is a small hardening phase for the local/dev read-only dashboard.

## Scope

This phase does not change PHP Gateway behavior, Agent APIs, Mother APIs, policy sync behavior, queue behavior, ticket behavior, waiting-room rendering, or WordPress loading.

PHP remains the source of truth. The Agent remains shadow-only. Mother remains a local/dev policy provider.

## Server-only dashboard environment variables

The dashboard now prefers server-only environment variables:

```env
UNIXSEE_AGENT_BASE_URL=http://127.0.0.1:8731
UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732
```

Because dashboard data fetching is server-side, these variables do not need the `NEXT_PUBLIC_` prefix.

## Backward-compatible fallback

For compatibility with R8B local setups, the dashboard still falls back to:

```env
NEXT_PUBLIC_UNIXSEE_AGENT_BASE_URL=http://127.0.0.1:8731
NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732
```

If neither server-only nor legacy variables are present, the dashboard falls back to:

```text
http://127.0.0.1:8731
http://127.0.0.1:8732
```

## Local/dev warning

The dashboard is read-only and intended for trusted local/dev use. Do not expose it publicly without authentication and reverse-proxy protection. R8B.1 does not add auth, policy writes, destructive actions, remote commands, billing, or production SaaS hardening.

## Secrets

No secrets should be placed in `.env.example`. The dashboard does not need shared secrets or tokens in this phase.

## Dependency audit status

`npm audit` was run during validation. The initial audit reported a moderate PostCSS advisory through Next.js. A safe non-breaking `overrides.postcss` update to `^8.5.10` was applied instead of accepting the unsafe `npm audit fix --force` downgrade path. Final audit result: `found 0 vulnerabilities`.

## Release hygiene

The release scanner must fail if dashboard runtime artifacts are accidentally included:

```text
dashboard/node_modules/
dashboard/.next/
dashboard/out/
dashboard/.env
```

Existing runtime/cache/log/binary checks remain active.

## Next phase options

- R8A PostgreSQL persistence in an internet-enabled Go environment with real `pgx/v5` available.
- R8C Policy Assignment API.
- R8D Installer/Test Plan.
