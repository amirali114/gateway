# R9.4 — Dashboard Auth and Access Control

R9.4 adds staging-grade authentication for the Mother-backed dashboard and protects Mother management write APIs.

## What changed

- Added `/login` and `/logout` for the Next.js dashboard.
- Protected dashboard routes with server-side session validation.
- Added bcrypt password verification via `DASHBOARD_ADMIN_PASSWORD_HASH`.
- Added signed, HTTP-only, SameSite=Lax session cookie with an 8 hour lifetime.
- Added server-only Mother management token support via `UNIXSEE_MOTHER_MANAGEMENT_TOKEN`.
- Added Mother `management.api_token` protection for write endpoints.
- Dashboard write calls remain server-side only.

## Auth model

Environment variables:

```env
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_ADMIN_USERNAME=admin
DASHBOARD_ADMIN_PASSWORD_HASH=$2b$...
DASHBOARD_SESSION_SECRET=replace-with-long-random-secret
UNIXSEE_MOTHER_MANAGEMENT_TOKEN=
```

Generate a bcrypt hash:

```bash
cd dashboard
node scripts/hash-password.mjs
```

The dashboard does not store plain passwords. Never commit real password hashes or session secrets.

## Session model

The dashboard session is an HMAC-signed token stored in an HTTP-only cookie:

- `httpOnly=true`
- `sameSite=lax`
- `secure=true` in production or behind HTTPS proxy
- default expiry: 8 hours

No token is stored in localStorage.

## Mother write API protection

Mother config supports:

```yaml
management:
  enabled: true
  write_enabled: true
  api_token: ""
```

When `api_token` is set, write endpoints require:

```http
Authorization: Bearer <token>
```

Protected write endpoints include config draft/publish and policy management writes. GET endpoints remain read-only for now.

## Safety model

- PHP Gateway remains runtime source of truth.
- Agent remains shadow-only.
- Dashboard talks to Mother only.
- Dashboard does not write to site files.
- No remote shell commands exist.
- No PostgreSQL is added in this phase.

## Limitations

- Single admin role only.
- No OAuth/SSO yet.
- No public deployment profile yet; expose only behind HTTPS/reverse proxy protection.
- PostgreSQL persistence remains pending.

## Automated validation summary

R9.4 validation covers PHP lint/self-test, Go tests/builds, Dashboard npm build, security greps for secrets in build artifacts, release scan, and final ZIP runtime scan.
