#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
TEST_MODE="${TEST_MODE:-0}"
TOKEN="${UNIXSEE_MOTHER_MANAGEMENT_TOKEN:-}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

need_bin curl
need_bin grep

fetch_json() {
  local path="$1" out="$2"
  if curl -fsS --max-time 4 -H 'Accept: application/json' "$MOTHER_URL$path" -o "$out"; then
    pass "GET $path"
  else
    fail "GET $path failed"
  fi
}

scan_no_secrets() {
  local file="$1" label="$2"
  if grep -Ei '(api[_-]?token|session[_-]?secret|password|cookie|dsn)[^:]{0,24}:[[:space:]]*[A-Za-z0-9_./:+@%-]{12,}' "$file" | grep -Evi '(configured|redacted|xxxxx|\[redacted\])' >/dev/null; then
    fail "$label may contain unredacted secret-looking values"
  fi
  pass "$label secret redaction scan"
}

fetch_json '/v1/health/report' "$TMP_DIR/health.json"
fetch_json '/v1/alerts/summary' "$TMP_DIR/alerts-summary.json"
fetch_json '/v1/diagnostics/summary' "$TMP_DIR/diagnostics-summary.json"

for f in "$TMP_DIR"/*.json; do
  grep -q '"ok"' "$f" || fail "missing ok field in $(basename "$f")"
  scan_no_secrets "$f" "$(basename "$f")"
done

if [[ "$TEST_MODE" == "1" ]]; then
  if [[ -z "$TOKEN" ]]; then
    warn "TEST_MODE=1 requested but UNIXSEE_MOTHER_MANAGEMENT_TOKEN is empty; skipping POST /v1/alerts/evaluate"
  else
    if curl -fsS --max-time 4 -X POST -H 'Accept: application/json' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' "$MOTHER_URL/v1/alerts/evaluate" -d '{}' -o "$TMP_DIR/evaluate.json"; then
      pass "POST /v1/alerts/evaluate"
      scan_no_secrets "$TMP_DIR/evaluate.json" "evaluate.json"
    else
      fail "POST /v1/alerts/evaluate failed"
    fi
  fi
else
  warn "TEST_MODE=0; POST /v1/alerts/evaluate skipped"
fi

pass "observability validation complete"
