#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
WEBROOT="${UXGW_WEBROOT:-}"
PRIVATE_RUNTIME_FILE="${UXGW_PHP_PRIVATE_RUNTIME:-$PREFIX/gateway.php}"
WRAPPER_SOURCE="${UXGW_WRAPPER_SOURCE:-$(cd "$SCRIPT_DIR/.." && pwd)/php-wrapper/gateway.php}"
WRAPPER_DIR="${UXGW_WRAPPER_DIR:-unixsee-gateway}"
say "Install PHP Gateway public wrapper only. DRY_RUN=$DRY_RUN APPLY=$APPLY"
[[ -n "$WEBROOT" ]] || fail "set UXGW_WEBROOT to the staging webroot"
safe_webroot_path "$WEBROOT" || fail "unsafe WEBROOT"
safe_abs_path "$PRIVATE_RUNTIME_FILE" || fail "unsafe PHP private runtime file"
[[ "$WRAPPER_DIR" != *"/"* && "$WRAPPER_DIR" != *".."* ]] || fail "unsafe wrapper directory"
[[ -f "$WRAPPER_SOURCE" ]] || fail "minimal wrapper source missing: $WRAPPER_SOURCE"
if [[ -d "$WEBROOT" ]]; then
  if is_under_path "$(dirname "$PRIVATE_RUNTIME_FILE")" "$WEBROOT"; then
    fail "private runtime must be outside webroot"
  fi
fi
backup_path "$WEBROOT/$WRAPPER_DIR" php-wrapper-before-install
run_cmd install -d -m 0755 "$WEBROOT/$WRAPPER_DIR"
run_cmd install -m 0644 "$WRAPPER_SOURCE" "$WEBROOT/$WRAPPER_DIR/gateway.php"
validate_no_forbidden_webroot_files "$WEBROOT" "$WRAPPER_DIR"
pass "PHP public wrapper installed/planned: $WEBROOT/$WRAPPER_DIR/gateway.php"
pass "private runtime expected: $PRIVATE_RUNTIME_FILE"
