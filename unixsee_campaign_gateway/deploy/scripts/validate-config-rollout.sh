#!/usr/bin/env bash
set -euo pipefail

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
TEST_MODE="${TEST_MODE:-0}"
TOKEN="${UNIXSEE_MOTHER_MANAGEMENT_TOKEN:-}"

fail() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "OK: $*"; }

need() { command -v "$1" >/dev/null 2>&1 || fail "missing required tool: $1"; }
need curl
need grep

curl_get() {
  curl -fsS --max-time 3 "$MOTHER_URL$1"
}

curl_post() {
  local path="$1" body="$2"
  if [[ -n "$TOKEN" ]]; then
    curl -fsS --max-time 3 -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$body" "$MOTHER_URL$path"
  else
    curl -fsS --max-time 3 -H "Content-Type: application/json" -d "$body" "$MOTHER_URL$path"
  fi
}

agents_json="$(curl_get /v1/agents)" || fail "cannot read /v1/agents"
ok "Mother /v1/agents reachable"

agent_id="$(printf '%s' "$agents_json" | grep -o '"agent_id":"[^"]*"' | head -1 | cut -d: -f2 | tr -d '"' || true)"
if [[ -z "$agent_id" ]]; then
  agent_id="rollout-validation-agent"
  echo "WARN: no registered agent found; using safe dummy agent id for read checks: $agent_id"
fi

curl_get "/v1/agents/$agent_id/config" >/dev/null || fail "config endpoint failed"
ok "config endpoint reachable"
curl_get "/v1/agents/$agent_id/config/draft" >/dev/null || fail "draft endpoint failed"
ok "draft endpoint reachable"
curl_get "/v1/agents/$agent_id/config/active" >/dev/null || fail "active endpoint failed"
ok "active endpoint reachable"
curl_get "/v1/agents/$agent_id/config/versions" >/dev/null || fail "versions endpoint failed"
ok "versions endpoint reachable"
curl_get "/v1/agents/$agent_id/config/diff" >/dev/null || fail "diff endpoint failed"
ok "diff endpoint reachable"

if [[ "$TEST_MODE" == "1" ]]; then
  body='{"config":{"gateway":{"enabled":true,"mode":"shadow","default_action":"allow"},"campaign":{"enabled":true},"queue":{"enabled":false},"bot":{"enabled":false},"storage":{"fail_mode":"open"},"security":{"require_signature":true}}}'
  curl_post "/v1/agents/$agent_id/config/draft" "$body" >/dev/null || fail "draft save failed; set UNIXSEE_MOTHER_MANAGEMENT_TOKEN when token is required"
  ok "draft saved in TEST_MODE"
  curl_post "/v1/agents/$agent_id/config/publish" '{"note":"safe rollout validation publish"}' >/dev/null || fail "publish failed"
  ok "draft published in TEST_MODE"
  versions="$(curl_get "/v1/agents/$agent_id/config/versions")"
  target="$(printf '%s' "$versions" | grep -o '"version":[0-9]*' | tail -1 | cut -d: -f2 || true)"
  if [[ -n "$target" ]]; then
    curl_post "/v1/agents/$agent_id/config/rollback" "{\"target_version\":$target,\"note\":\"safe rollout validation rollback\"}" >/dev/null || fail "rollback failed"
    ok "rollback created in TEST_MODE"
  fi
else
  ok "TEST_MODE disabled; no draft/publish/rollback writes performed"
fi

ok "config rollout validation completed"
