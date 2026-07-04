#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
WEBROOT="${UXGW_WEBROOT:-}"
WRAPPER_DIR="${UXGW_WRAPPER_DIR:-unixsee-gateway}"
ARCHIVE="${UXGW_ROLLBACK_ARCHIVE:-}"
[[ -n "$WEBROOT" ]] || fail "set UXGW_WEBROOT"
[[ -n "$ARCHIVE" ]] || fail "set UXGW_ROLLBACK_ARCHIVE to wrapper backup tar.gz"
[[ -f "$ARCHIVE" ]] || fail "rollback archive not found: $ARCHIVE"
safe_webroot_path "$WEBROOT" || fail "unsafe WEBROOT"
backup_path "$WEBROOT/$WRAPPER_DIR" php-wrapper-before-rollback
run_cmd tar -C / -xzf "$ARCHIVE"
validate_no_forbidden_webroot_files "$WEBROOT" "$WRAPPER_DIR"
pass "PHP wrapper rollback completed/planned"
