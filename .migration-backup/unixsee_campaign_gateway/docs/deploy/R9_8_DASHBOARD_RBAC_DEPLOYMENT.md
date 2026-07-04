# R9.8 Dashboard RBAC Deployment Notes

## Storage path

Recommended dashboard storage path:

```text
/var/lib/unixsee-gateway/dashboard
```

It stores:

```text
users.json
audit.jsonl
users.json.bak
```

Keep this path outside webroot.

## Environment

```env
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_USER_STORE_PATH=/var/lib/unixsee-gateway/dashboard
DASHBOARD_BOOTSTRAP_ADMIN_USERNAME=admin
DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH=$2b$12$replace-with-generated-bcrypt-hash
DASHBOARD_SESSION_SECRET=change-me-long-random-secret-at-least-32-chars
UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732
UNIXSEE_MOTHER_MANAGEMENT_TOKEN=change-me
```

Never put plaintext passwords in environment files.

## Permissions

The service user running Dashboard must be able to read/write only the Dashboard storage path and runtime Next.js files.

Systemd `ReadWritePaths` should include:

```text
/var/lib/unixsee-gateway/dashboard
```

## Validation

```bash
deploy/scripts/validate-dashboard-rbac.sh
```

The script checks:

- login protection behavior
- user store path safety
- bootstrap/user store presence
- `/users` and `/audit` protection
- static bundle secret leakage

## Rollback

- Stop Dashboard.
- Restore previous ZIP/app version.
- Keep `/var/lib/unixsee-gateway/dashboard` unless intentionally resetting users.
- If credentials are wrong, stop Dashboard, move `users.json` aside, set bootstrap env, then start Dashboard to recreate initial owner.

## Limitations

- No SSO/OAuth.
- No 2FA.
- Local JSON user store is staging-grade.
- Dashboard must still be exposed only behind HTTPS/reverse proxy.
