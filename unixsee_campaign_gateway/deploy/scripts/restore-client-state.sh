#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
ARCHIVE="${RESTORE_ARCHIVE:-}"
say "Client state restore. DRY_RUN=$DRY_RUN"
[[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || fail "set RESTORE_ARCHIVE to an existing backup archive"
backup_path "$STATE_DIR/agent" agent-state-before-restore
run_cmd tar -C / -xzf "$ARCHIVE"
pass "client restore plan completed"
