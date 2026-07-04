#!/usr/bin/env bash
set -euo pipefail

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
STORAGE_PATH="${MOTHER_STORAGE_PATH:-/var/lib/unixsee-gateway/mother}"
TEST_MODE="${TEST_MODE:-0}"
TOKEN="${UNIXSEE_MOTHER_MANAGEMENT_TOKEN:-}"

say() { printf '[unixsee-mother-persistence] %s\n' "$*"; }
fail() { say "FAIL: $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "missing tool: $1"; }

need curl
need sed

say "checking storage path: ${STORAGE_PATH}"
[[ -d "$STORAGE_PATH" ]] || fail "storage path does not exist: ${STORAGE_PATH}"
[[ -w "$STORAGE_PATH" ]] || fail "storage path is not writable by current user: ${STORAGE_PATH}"

say "checking Mother storage status endpoint"
status_json="$(curl -fsS --max-time 3 "${MOTHER_URL%/}/v1/storage/status" || true)"
[[ -n "$status_json" ]] || fail "Mother /v1/storage/status unavailable"
printf '%s\n' "$status_json" | grep -q '"ok"[[:space:]]*:[[:space:]]*true' || fail "Mother storage status is not ok"
printf '%s\n' "$status_json" | grep -q '"writable"[[:space:]]*:[[:space:]]*true' || fail "Mother storage status is not writable"

if [[ "$TEST_MODE" == "1" ]]; then
  say "test mode enabled: creating safe dummy draft/publish via Mother API"
  [[ -n "$TOKEN" ]] || fail "TEST_MODE=1 requires UNIXSEE_MOTHER_MANAGEMENT_TOKEN"
  agent="persistence-smoke-agent"
  payload='{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}'
  curl -fsS --max-time 5 -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' -d "$payload" "${MOTHER_URL%/}/v1/agents/${agent}/config/draft" >/dev/null || fail "draft save failed"
  curl -fsS --max-time 5 -H "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' -d '{}' "${MOTHER_URL%/}/v1/agents/${agent}/config/publish" >/dev/null || fail "publish failed"
  curl -fsS --max-time 5 "${MOTHER_URL%/}/v1/agents/${agent}/config/history" | grep -q '"history"' || fail "history check failed"
fi

say "PASS: Mother persistence checks completed"
