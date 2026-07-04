# R9.8 — Dashboard RBAC and Operator Audit

R9.8 replaces the single-admin staging login with a local multi-user RBAC model for the Mother-backed Dashboard.

## Summary

- PHP Gateway remains runtime source of truth.
- Go Agent remains shadow-only.
- Dashboard still talks only to Mother APIs.
- Mother management token is never sent to the browser.
- Dashboard users are stored locally in a JSON file with atomic writes.
- Operator actions are written to a local JSONL audit trail.

## User model

Fields stored per user:

- `id`
- `username`
- `display_name`
- `email`
- `role`
- `status`
- `password_hash`
- `created_at`
- `updated_at`
- `last_login_at`
- `password_changed_at`

Passwords are bcrypt hashes only. Plaintext passwords are never stored or displayed after submission.

## Roles

| Role | Persian label | Summary |
|---|---|---|
| `owner` | مالک | Full access, including user management. |
| `admin` | مدیر | Agent/config operations and audit viewing, no owner management. |
| `operator` | اپراتور | View and save drafts, no publish/rollback. |
| `viewer` | مشاهده‌گر | Read-only dashboard. |

## Permissions

Explicit permissions:

- `dashboard.view`
- `agents.view`
- `gateway.view`
- `gateway.draft.write`
- `gateway.publish`
- `gateway.rollback`
- `policy.view`
- `diagnostics.view`
- `settings.view`
- `users.view`
- `users.manage`
- `audit.view`

Server actions check permissions. Buttons are hidden/disabled for convenience, but hiding buttons is not the security boundary.

## Bootstrap admin

Recommended env:

```env
DASHBOARD_USER_STORE_PATH=/var/lib/unixsee-gateway/dashboard
DASHBOARD_BOOTSTRAP_ADMIN_USERNAME=admin
DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH=$2b$12$replace-with-generated-bcrypt-hash
DASHBOARD_BOOTSTRAP_ADMIN_EMAIL=
```

Backward-compatible R9.4 aliases are still accepted as bootstrap source:

```env
DASHBOARD_ADMIN_USERNAME=admin
DASHBOARD_ADMIN_PASSWORD_HASH=$2b$12$replace-with-generated-bcrypt-hash
```

Generate a password hash:

```bash
cd dashboard
node scripts/hash-password.mjs
```

## User management

New route:

```text
/users
```

Capabilities:

- list users
- create users
- edit display name/email/role/status
- reset password
- disable/enable users
- prevent disabling or downgrading the last active owner

## Audit trail

New route:

```text
/audit
```

Audit events include:

- login success/failure
- logout
- user created/updated/disabled
- password reset
- config draft saved
- config published
- config rollback
- permission denied
- API write failures

Audit metadata is sanitized. Secrets, passwords, tokens, cookies and full sensitive payloads are not written.

## Mother actor propagation

Dashboard server-side write calls add metadata headers:

```text
X-Unixsee-Actor-ID
X-Unixsee-Actor-Username
X-Unixsee-Actor-Role
```

Mother stores these only as metadata (`created_by`, `published_by`, `rollback_by`). These headers are not authentication and must not be trusted from public clients.

## Safety model

- Agent remains shadow-only.
- Publish updates Mother config only.
- Agent pulls config on its next interval.
- No remote commands are executed.
- No direct file/site writes are performed by Dashboard.
- Mother management token remains server-only.

## Automated validation summary

R9.8 validation must run:

- PHP lint/self-test/release scan
- Agent Go tests/build
- Mother Go tests/build
- Dashboard npm install/build
- Static bundle secret scan
- Release ZIP runtime scan

## Limitations

- PostgreSQL is still not added.
- RBAC is local-dashboard storage, not centralized identity.
- No SSO/OAuth yet.
- No 2FA yet.
- JSON/local storage is staging-grade, not HA.
- Audit retention is local and limited.
