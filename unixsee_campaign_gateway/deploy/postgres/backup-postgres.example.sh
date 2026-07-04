#!/usr/bin/env bash
set -euo pipefail
: "${UNIXSEE_MOTHER_POSTGRES_DSN:?set UNIXSEE_MOTHER_POSTGRES_DSN in a protected environment file}"
OUT_DIR="${OUT_DIR:-/var/backups/unixsee-gateway}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/mother-postgres-$(date -u +%Y%m%dT%H%M%SZ).dump"
echo "Creating PostgreSQL backup at $OUT"
pg_dump --format=custom --no-owner --no-acl --dbname="$UNIXSEE_MOTHER_POSTGRES_DSN" --file="$OUT"
chmod 0640 "$OUT"
echo "Backup complete. Keep this file outside webroot. DSN was not printed."
