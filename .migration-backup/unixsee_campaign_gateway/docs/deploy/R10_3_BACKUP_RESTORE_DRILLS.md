# R10.3 Backup/Restore Drills

R10.3 adds dry-run drill wrappers. They verify archive readability and expected backup structure without overwriting live state.

Core drill:

```bash
ARCHIVE=/var/backups/unixsee-gateway/core.tar.gz deploy/scripts/drill-backup-restore-core.sh
```

Client drill:

```bash
ARCHIVE=/var/backups/unixsee-gateway/client.tar.gz deploy/scripts/drill-backup-restore-client.sh
```

Rules:

- Dry-run by default.
- Secrets are never printed.
- `RESTORE_APPLY=1` is intentionally not a live restore automation; the drill still avoids overwriting live state.
- Warnings must be reviewed and recorded in the beta operator checklist.
