# R10.0 Rollback

Rollback uses timestamped backup archives. It does not enable enforcement and does not execute remote commands.

## Core rollback

```bash
DRY_RUN=1 RESTORE_ARCHIVE=/var/backups/unixsee-gateway/<ts>/core-prefix-before-update.tar.gz deploy/scripts/rollback-core.sh
```

## Agent rollback

```bash
DRY_RUN=1 RESTORE_ARCHIVE=/var/backups/unixsee-gateway/<ts>/agent-prefix-before-update.tar.gz deploy/scripts/rollback-agent.sh
```

## PHP wrapper rollback

```bash
DRY_RUN=1 RESTORE_ARCHIVE=/var/backups/unixsee-gateway/<ts>/php-wrapper-before-install.tar.gz deploy/scripts/rollback-php-gateway-wrapper.sh
```

## Safety notes
- Do not delete uploads or database data.
- Do not delete Mother/Dashboard storage unless intentionally restoring from a known-good backup.
- Do not expose Agent publicly during rollback.
- PHP Gateway should continue to return pass/source-of-truth behavior.
