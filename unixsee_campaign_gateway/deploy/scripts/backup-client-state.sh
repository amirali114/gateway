#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
INCLUDE_SECRETS="${INCLUDE_SECRETS:-0}"
WEBROOT="${UXGW_WEBROOT:-}"
PRIVATE_RUNTIME="${UXGW_PHP_PRIVATE_RUNTIME:-}"
OUT="${BACKUP_DIR}/client-state-${TS}.tar.gz"
say "Client state backup. INCLUDE_SECRETS=$INCLUDE_SECRETS DRY_RUN=$DRY_RUN"
run_cmd mkdir -p "$BACKUP_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/client"
for p in "$STATE_DIR/agent" "$LOG_DIR" "$PRIVATE_RUNTIME"; do [[ -n "$p" && -e "$p" ]] && tar -C / -rf "$TMP/client/state.tar" "${p#/}" 2>/dev/null || true; done
[[ -n "$WEBROOT" && -e "$WEBROOT/unixsee-gateway/gateway.php" ]] && tar -C / -rf "$TMP/client/state.tar" "${WEBROOT#/}/unixsee-gateway/gateway.php" 2>/dev/null || true
if [[ "$INCLUDE_SECRETS" == "1" ]]; then
  for p in "$ETC_DIR/agent.yml" "$ETC_DIR/mother-agent.secret"; do [[ -e "$p" ]] && tar -C / -rf "$TMP/client/state.tar" "${p#/}" 2>/dev/null || true; done
else
  warn "agent config/secret excluded; set INCLUDE_SECRETS=1 to include them"
fi
if [[ -n "$WEBROOT" ]]; then
  find "$WEBROOT/unixsee-gateway" -maxdepth 2 -type f 2>/dev/null | sed 's#^#webroot: #' > "$TMP/client/webroot-exposure-report.txt" || true
fi
run_cmd tar -C "$TMP/client" -czf "$OUT" .
pass "client backup archive planned at $OUT"
