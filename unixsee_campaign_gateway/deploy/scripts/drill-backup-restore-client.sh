#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

ARCHIVE="${ARCHIVE:-}"
RESTORE_APPLY="${RESTORE_APPLY:-0}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
[[ -n "$ARCHIVE" ]] || fail "ARCHIVE=/path/client-backup.tar.gz is required"
[[ -f "$ARCHIVE" ]] || fail "backup archive missing: $ARCHIVE"
need_bin tar

tar -tzf "$ARCHIVE" > "$TMP_DIR/list.txt" || fail "archive cannot be listed"
pass "archive structure readable"
check_entry(){ local pattern="$1" label="$2"; if grep -E "$pattern" "$TMP_DIR/list.txt" >/dev/null; then pass "$label present"; else warn "$label missing or intentionally excluded"; fi; }
check_entry '(^|/)agent\.yml$|etc/unixsee-gateway/agent\.yml' 'Agent config backup'
check_entry 'mother-agent\.secret' 'Mother-Agent secret backup'
check_entry 'var/lib/unixsee-gateway/agent|agent/storage|agent\.json' 'Agent storage backup'
check_entry 'unixsee_campaign_gateway|gateway\.php' 'PHP private runtime backup'
check_entry 'unixsee-gateway/gateway\.php|public-wrapper|php-wrapper' 'public wrapper backup'
check_entry 'exposure|webroot' 'webroot exposure report'
if grep -E 'mother-agent\.secret|secret|token|password' "$TMP_DIR/list.txt" >/dev/null; then warn "secret-bearing files included; this should only happen with INCLUDE_SECRETS=1 and restricted permissions"; else pass "secrets appear excluded"; fi
mkdir -p "$TMP_DIR/restore"
tar -xzf "$ARCHIVE" -C "$TMP_DIR/restore" || fail "archive dry restore failed"
pass "dry restore to temp dir passed"
[[ "$RESTORE_APPLY" == "1" ]] && warn "RESTORE_APPLY=1 requested; live restore is intentionally not automated by this drill wrapper" || pass "live restore not applied"
