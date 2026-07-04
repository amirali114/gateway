#!/usr/bin/env bash
set -euo pipefail
: "${UNIXSEE_MOTHER_POSTGRES_DSN:?set UNIXSEE_MOTHER_POSTGRES_DSN in a protected environment file}"
: "${DUMP_FILE:?set DUMP_FILE to a trusted pg_dump custom backup}"
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Backup file not found" >&2
  exit 1
fi
echo "Restoring PostgreSQL backup from $DUMP_FILE"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$UNIXSEE_MOTHER_POSTGRES_DSN" "$DUMP_FILE"
echo "Restore complete. Verify /v1/storage/status before starting production traffic."
