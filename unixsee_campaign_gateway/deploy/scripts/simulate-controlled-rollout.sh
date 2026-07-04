#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
AGENT_ID="${AGENT_ID:-}"
DUMMY_AGENT_ID="${DUMMY_AGENT_ID:-}"
TEST_MODE="${TEST_MODE:-0}"
TOKEN="${UNIXSEE_MOTHER_MANAGEMENT_TOKEN:-}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
need_bin curl
[[ -n "$AGENT_ID" || -n "$DUMMY_AGENT_ID" ]] || fail "AGENT_ID or DUMMY_AGENT_ID is required"
TARGET_ID="${DUMMY_AGENT_ID:-$AGENT_ID}"

if [[ "$TEST_MODE" != "1" && -n "$DUMMY_AGENT_ID" ]]; then
  warn "DUMMY_AGENT_ID supplied but TEST_MODE=0; no mutation will occur"
fi
if [[ "$TEST_MODE" != "1" && "$TARGET_ID" != "${DUMMY_AGENT_ID:-}" ]]; then
  pass "simulation target is read-only: $TARGET_ID"
fi

curl -fsS --max-time 5 -H 'Accept: application/json' "$MOTHER_URL/v1/agents" -o "$TMP_DIR/agents.json" || fail "could not read agents"
if grep -F "\"agent_id\":\"$TARGET_ID\"" "$TMP_DIR/agents.json" >/dev/null || [[ "$TEST_MODE" == "1" && -n "$DUMMY_AGENT_ID" ]]; then
  pass "selected agent check passed: $TARGET_ID"
else
  warn "selected agent not found in registry: $TARGET_ID"
fi

curl -fsS --max-time 5 -H 'Accept: application/json' "$MOTHER_URL/v1/agents/$TARGET_ID/config/active" -o "$TMP_DIR/active.json" || warn "active config unavailable for $TARGET_ID"
cat > "$TMP_DIR/candidate.json" <<'JSON'
{
  "config": {
    "gateway": { "enabled": true, "mode": "shadow", "default_action": "allow" },
    "campaign": { "enabled": true },
    "queue": { "enabled": false },
    "bot": { "enabled": false },
    "storage": { "fail_mode": "open" },
    "security": { "require_signature": true }
  }
}
JSON
pass "candidate config generated in temp file"

curl -fsS --max-time 5 -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' "$MOTHER_URL/v1/agents/$TARGET_ID/config/validate" -d @"$TMP_DIR/candidate.json" -o "$TMP_DIR/validate.json" || fail "candidate validation failed"
pass "candidate validation endpoint accepted request"
if grep -q '"valid"[[:space:]]*:[[:space:]]*false' "$TMP_DIR/validate.json"; then fail "candidate config invalid"; else pass "candidate config is valid shadow-only config"; fi

if [[ "$TEST_MODE" == "1" ]]; then
  [[ -n "$DUMMY_AGENT_ID" ]] || fail "TEST_MODE=1 requires DUMMY_AGENT_ID"
  [[ -n "$TOKEN" ]] || fail "TEST_MODE=1 requires UNIXSEE_MOTHER_MANAGEMENT_TOKEN"
  auth=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Accept: application/json')
  curl -fsS --max-time 5 -X POST "${auth[@]}" "$MOTHER_URL/v1/agents/$DUMMY_AGENT_ID/config/draft" -d @"$TMP_DIR/candidate.json" -o "$TMP_DIR/draft.json" || fail "dummy draft failed"
  pass "dummy draft created"
  curl -fsS --max-time 5 -X POST "${auth[@]}" "$MOTHER_URL/v1/agents/$DUMMY_AGENT_ID/config/publish" -d '{}' -o "$TMP_DIR/publish.json" || fail "dummy publish failed"
  pass "dummy publish passed"
else
  warn "TEST_MODE=0; no draft/publish/rollback mutation executed"
fi
