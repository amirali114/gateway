#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
SOURCE_DIR="${UXGW_SOURCE_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

say "Unixsee core install/update plan. DRY_RUN=$DRY_RUN APPLY=$APPLY"
need_bin rsync
need_bin tar
need_bin go
need_bin npm
safe_abs_path "$PREFIX" || fail "unsafe UXGW_PREFIX"
safe_abs_path "$BIN_DIR" || fail "unsafe UXGW_BIN_DIR"
safe_abs_path "$ETC_DIR" || fail "unsafe UXGW_ETC_DIR"
safe_abs_path "$STATE_DIR" || fail "unsafe UXGW_STATE_DIR"
safe_abs_path "$LOG_DIR" || fail "unsafe UXGW_LOG_DIR"

ensure_dir "$(dirname "$PREFIX")" 0755
ensure_dir "$PREFIX" 0755
ensure_dir "$BIN_DIR" 0755
ensure_dir "$ETC_DIR" 0750
ensure_dir "$STATE_DIR/mother" 0750
ensure_dir "$STATE_DIR/dashboard" 0750
ensure_dir "$LOG_DIR" 0750

backup_path "$PREFIX" core-prefix-before-install
backup_path "$BIN_DIR/unixsee-mother" mother-binary-before-install
copy_tree_preserve "$SOURCE_DIR" "$PREFIX"

say "Build Mother binary"
run_cmd bash -lc "cd '$PREFIX/mother' && go build -o '$BIN_DIR/unixsee-mother' ./cmd/unixsee-mother"

say "Build Dashboard"
run_cmd bash -lc "cd '$PREFIX/dashboard' && npm ci && npm run build"

copy_if_missing "$PREFIX/deploy/examples/core/mother.staging.yml" "$ETC_DIR/mother.yml" 0640
copy_if_missing "$PREFIX/deploy/examples/core/mother.env.example" "$ETC_DIR/mother.env" 0640
copy_if_missing "$PREFIX/deploy/examples/dashboard/dashboard.env.example" "$ETC_DIR/dashboard.env" 0640

install_systemd_unit "$PREFIX/deploy/systemd/unixsee-mother.service.example" unixsee-mother.service
install_systemd_unit "$PREFIX/deploy/systemd/unixsee-dashboard.service.example" unixsee-dashboard.service

pass "core install/update plan completed"
