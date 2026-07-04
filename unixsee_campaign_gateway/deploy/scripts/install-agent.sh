#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
SOURCE_DIR="${UXGW_SOURCE_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

say "Unixsee Agent install/update plan. Agent remains shadow-only and local-only. DRY_RUN=$DRY_RUN APPLY=$APPLY"
need_bin rsync
need_bin tar
need_bin go
safe_abs_path "$PREFIX" || fail "unsafe UXGW_PREFIX"
safe_abs_path "$BIN_DIR" || fail "unsafe UXGW_BIN_DIR"
safe_abs_path "$ETC_DIR" || fail "unsafe UXGW_ETC_DIR"
safe_abs_path "$STATE_DIR" || fail "unsafe UXGW_STATE_DIR"
safe_abs_path "$LOG_DIR" || fail "unsafe UXGW_LOG_DIR"

ensure_dir "$(dirname "$PREFIX")" 0755
ensure_dir "$PREFIX" 0755
ensure_dir "$BIN_DIR" 0755
ensure_dir "$ETC_DIR" 0750
ensure_dir "$STATE_DIR/agent" 0750
ensure_dir "$LOG_DIR" 0750

backup_path "$PREFIX/agent" agent-source-before-install
backup_path "$BIN_DIR/unixsee-agent" agent-binary-before-install
run_cmd mkdir -p "$PREFIX"
run_cmd rsync -a --delete "$SOURCE_DIR/agent/" "$PREFIX/agent/"
run_cmd rsync -a "$SOURCE_DIR/deploy/" "$PREFIX/deploy/"

say "Build Agent binary"
run_cmd bash -lc "cd '$PREFIX/agent' && go build -o '$BIN_DIR/unixsee-agent' ./cmd/unixsee-agent"

copy_if_missing "$PREFIX/deploy/examples/client/agent.staging.yml" "$ETC_DIR/agent.yml" 0640
copy_if_missing "$PREFIX/deploy/examples/client/agent.env.example" "$ETC_DIR/agent.env" 0640
if [[ ! -e "$ETC_DIR/mother-agent.secret" ]]; then
  warn "$ETC_DIR/mother-agent.secret missing; create with install -m 0600 and never commit it"
else
  pass "preserve shared secret file: $ETC_DIR/mother-agent.secret"
fi

install_systemd_unit "$PREFIX/deploy/systemd/unixsee-agent.service.example" unixsee-agent.service
pass "agent install/update plan completed"
