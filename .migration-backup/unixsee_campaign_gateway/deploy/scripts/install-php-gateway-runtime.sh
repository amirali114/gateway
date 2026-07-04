#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
SOURCE_DIR="${UXGW_SOURCE_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
PRIVATE_RUNTIME="${UXGW_PHP_PRIVATE_RUNTIME_DIR:-$PREFIX}"
say "Install PHP Gateway private runtime outside webroot. DRY_RUN=$DRY_RUN APPLY=$APPLY"
need_bin rsync
safe_abs_path "$PRIVATE_RUNTIME" || fail "unsafe private runtime path"
[[ "$PRIVATE_RUNTIME" != *public_html* && "$PRIVATE_RUNTIME" != *www*"/html"* ]] || warn "verify runtime is outside public webroot: $PRIVATE_RUNTIME"
backup_path "$PRIVATE_RUNTIME" php-runtime-before-install
ensure_dir "$PRIVATE_RUNTIME" 0755
run_cmd rsync -a --delete \
  --exclude 'dashboard/node_modules/' --exclude 'dashboard/.next/' \
  --exclude 'logs/*' --exclude '*.sqlite' --exclude '*.db' --exclude '*.log' --exclude '.env' \
  "$SOURCE_DIR/" "$PRIVATE_RUNTIME/"
pass "private PHP runtime install/update plan completed: $PRIVATE_RUNTIME"
