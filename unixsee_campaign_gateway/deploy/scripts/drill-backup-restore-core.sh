#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

ARCHIVE="${ARCHIVE:-}"
RESTORE_APPLY="${RESTORE_APPLY:-0}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
[[ -n "$ARCHIVE" ]] || fail "ARCHIVE=/path/core-backup.tar.gz is required"
[[ -f "$ARCHIVE" ]] || fail "backup archive missing: $ARCHIVE"
need_bin tar

tar -tzf "$ARCHIVE" > "$TMP_DIR/list.txt" || fail "archive cannot be listed"
pass "archive structure readable"

check_entry(){ local pattern="$1" label="$2"; if grep -E "$pattern" "$TMP_DIR/list.txt" >/dev/null; then pass "$label present"; else warn "$label missing or intentionally excluded"; fi; }
check_entry '(^|/)mother\.yml$|etc/unixsee-gateway/mother\.yml' 'Mother config backup'
check_entry '(^|/)dashboard\.env$|etc/unixsee-gateway/dashboard\.env' 'Dashboard env backup'
check_entry 'var/lib/unixsee-gateway/mother|mother/storage|mother\.json' 'Mother storage backup'
check_entry 'var/lib/unixsee-gateway/dashboard|dashboard/users' 'Dashboard storage backup'
check_entry 'unixsee-mother\.service|unixsee-dashboard\.service' 'systemd units backup'
if grep -E 'postgres|pg_dump|\.sql(\.gz)?$' "$TMP_DIR/list.txt" >/dev/null; then pass "optional PostgreSQL dump evidence present"; else warn "optional PostgreSQL dump not present"; fi
if grep -Ei 'secret|token|password|\.env$' "$TMP_DIR/list.txt" >/dev/null; then warn "archive appears to include secret-bearing files; keep access restricted"; else pass "secrets appear excluded from archive listing"; fi

mkdir -p "$TMP_DIR/restore"
tar -xzf "$ARCHIVE" -C "$TMP_DIR/restore" || fail "archive dry restore failed"
pass "dry restore to temp dir passed"
[[ "$RESTORE_APPLY" == "1" ]] && warn "RESTORE_APPLY=1 requested; live restore is intentionally not automated by this drill wrapper" || pass "live restore not applied"
