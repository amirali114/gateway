#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
REPORT_JSON="${REPORT_JSON:-0}"
OUTPUT="${OUTPUT:-}"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

need_bin curl

if ! curl -fsS --max-time 5 -H 'Accept: application/json' "$MOTHER_URL/v1/health/report" -o "$TMP_FILE"; then
  fail "could not collect /v1/health/report from $MOTHER_URL"
fi

if grep -Ei '(api[_-]?token|session[_-]?secret|password|cookie|dsn)[^:]{0,24}:[[:space:]]*[A-Za-z0-9_./:+@%-]{12,}' "$TMP_FILE" | grep -Evi '(configured|redacted|xxxxx|\[redacted\])' >/dev/null; then
  fail "health report may contain unredacted secret-looking values"
fi

if [[ -n "$OUTPUT" ]]; then
  run_cmd cp "$TMP_FILE" "$OUTPUT"
  pass "health report written: $OUTPUT"
fi

if [[ "$REPORT_JSON" == "1" ]]; then
  cat "$TMP_FILE"
else
  echo "Unixsee health report collected from $MOTHER_URL"
  grep -E '"ok"|"active_total"|"critical"|"warn"|"telemetry_summary"|"config_rollout_summary"|"storage"' "$TMP_FILE" | head -80 || true
fi
