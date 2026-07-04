#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
ARCHIVE="${UXGW_ROLLBACK_ARCHIVE:-}"
[[ -n "$ARCHIVE" ]] || fail "set UXGW_ROLLBACK_ARCHIVE to a PHP runtime backup tar.gz"
[[ -f "$ARCHIVE" ]] || fail "rollback archive not found: $ARCHIVE"
backup_path "$PREFIX" php-runtime-before-rollback
run_cmd tar -C / -xzf "$ARCHIVE"
pass "PHP private runtime rollback completed/planned"
