#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
ARCHIVE="${UXGW_ROLLBACK_ARCHIVE:-}"
[[ -n "$ARCHIVE" ]] || fail "set UXGW_ROLLBACK_ARCHIVE to a core backup tar.gz"
[[ -f "$ARCHIVE" ]] || fail "rollback archive not found: $ARCHIVE"
backup_path "$PREFIX" core-prefix-before-rollback
run_cmd tar -C / -xzf "$ARCHIVE"
pass "core rollback completed/planned"
