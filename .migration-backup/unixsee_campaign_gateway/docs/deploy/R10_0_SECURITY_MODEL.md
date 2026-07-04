# R10.0 Security Model

- PHP Gateway remains runtime source of truth.
- Agent remains shadow-only and local-only.
- Dashboard uses Mother APIs only.
- Browser never receives Mother management token.
- Dashboard uses local RBAC with signed httpOnly session cookies.
- Mother management writes require server-side bearer token.
- Config publish/rollback changes Mother state only.
- No remote shell execution exists.
- Public exposure requires HTTPS reverse proxy and auth.
- Mother remote exposure requires firewall allowlist for trusted Agent sources.
- Sensitive runtime files must remain outside webroot.

## Ports
- Agent: `127.0.0.1:8731`
- Mother: `127.0.0.1:8732` default, restricted remote only when needed
- Dashboard: `127.0.0.1:8740`

## Storage
- JSON: staging-grade persistence.
- PostgreSQL: optional production profile.
- No HA clustering in this release.
