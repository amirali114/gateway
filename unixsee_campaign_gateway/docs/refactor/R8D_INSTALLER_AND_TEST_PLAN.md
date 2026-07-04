# R8D Installer and Test Plan

R8D adds safe local/dev installer, validator, smoke test runner, systemd templates, rollback plan, and staging documentation.

## What R8D adds

```text
install/
  install-local-dev.sh
  uninstall-local-dev.sh
  validate-package.sh
  run-smoke-test.sh
  systemd/
  examples/

docs/deploy/
  STAGING_TEST_PLAN.md
  ROLLBACK_PLAN.md
  DIRECTADMIN_OPENLITESPEED_NOTES.md
  SECURITY_CHECKLIST.md
```

## Safety model

The installer defaults to dry-run and never touches WordPress, `public_html`, web server config, `.htaccess`, cron, sudoers, production services, or enforcement settings.

System-level actions require explicit flags such as `--apply`, `--systemd`, and `--system-user`.

## Validation

```bash
bash install/validate-package.sh
```

## Smoke test

```bash
bash install/run-smoke-test.sh
```

Optional dashboard smoke:

```bash
bash install/run-smoke-test.sh --dashboard
```

## Component roles

- PHP Gateway remains source of truth.
- Agent remains shadow-only.
- Mother remains local/dev policy provider.
- Dashboard remains read-only.

## Not implemented

R8D does not add enforcement, fake PostgreSQL, remote commands, billing, auth complexity, write UI, OLS rewrites, DirectAdmin automation, cron, or production auto-update.

## Next phase options

- R8A PostgreSQL persistence in a pgx-enabled environment.
- R8E controlled dashboard write UI behind disabled-by-default management writes.
- R8F production hardening plan with explicit reverse proxy/auth design.
