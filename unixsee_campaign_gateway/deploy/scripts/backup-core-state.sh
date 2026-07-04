#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
INCLUDE_SECRETS="${INCLUDE_SECRETS:-0}"
OUT="${BACKUP_DIR}/core-state-${TS}.tar.gz"
say "Core state backup. INCLUDE_SECRETS=$INCLUDE_SECRETS DRY_RUN=$DRY_RUN"
safe_abs_path "$BACKUP_DIR" || fail "unsafe backup dir"
run_cmd mkdir -p "$BACKUP_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/core"
for p in "$STATE_DIR/mother" "$STATE_DIR/dashboard" /etc/systemd/system/unixsee-mother.service /etc/systemd/system/unixsee-dashboard.service; do [[ -e "$p" ]] && tar -C / -rf "$TMP/core/state.tar" "${p#/}" 2>/dev/null || true; done
if [[ "$INCLUDE_SECRETS" == "1" ]]; then
  for p in "$ETC_DIR/mother.yml" "$ETC_DIR/mother.env" "$ETC_DIR/dashboard.env"; do [[ -e "$p" ]] && tar -C / -rf "$TMP/core/state.tar" "${p#/}" 2>/dev/null || true; done
else
  warn "secrets/env files excluded; set INCLUDE_SECRETS=1 to include them in archive"
fi
if [[ "${POSTGRES_BACKUP:-0}" == "1" && -n "${PGDATABASE:-}" ]]; then
  command -v pg_dump >/dev/null 2>&1 && pg_dump --format=custom --file "$TMP/core/postgres.dump" || warn "pg_dump failed or unavailable"
fi
run_cmd tar -C "$TMP/core" -czf "$OUT" .
pass "backup archive planned at $OUT"
