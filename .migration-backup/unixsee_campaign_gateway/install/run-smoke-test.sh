#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DASHBOARD=0
DASHBOARD_DEPS_CREATED=0
if [[ "${1:-}" == "--dashboard" ]]; then
  RUN_DASHBOARD=1
fi

for tool in go curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "missing required tool: $tool" >&2
    exit 2
  fi
done
if [[ "$RUN_DASHBOARD" -eq 1 ]] && ! command -v npm >/dev/null 2>&1; then
  echo "missing required tool for dashboard smoke: npm" >&2
  exit 2
fi
if [[ "$RUN_DASHBOARD" -eq 1 && ! -d "$ROOT/dashboard/node_modules" ]]; then
  DASHBOARD_DEPS_CREATED=1
  echo "dashboard dependencies missing; running npm ci for optional dashboard smoke"
  (cd "$ROOT/dashboard" && npm ci >/dev/null)
fi

TMP="$(mktemp -d)"
PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill -TERM -- "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
  done
  sleep 0.2
  for pid in "${PIDS[@]:-}"; do
    kill -KILL -- "-$pid" >/dev/null 2>&1 || kill -KILL "$pid" >/dev/null 2>&1 || true
  done
  wait >/dev/null 2>&1 || true
  rm -rf "$TMP"
  rm -rf "$ROOT/dashboard/.next" "$ROOT/dashboard/out"
  if [[ "$DASHBOARD_DEPS_CREATED" -eq 1 ]]; then
    rm -rf "$ROOT/dashboard/node_modules"
  fi
}
trap cleanup EXIT INT TERM

assert_port_free() {
  local url="$1" name="$2"
  if curl -fsS --max-time 1 "$url" >/dev/null 2>&1; then
    echo "refusing smoke test: $name already responds at $url" >&2
    echo "stop the existing local/dev service first; this script will not kill unrelated processes" >&2
    exit 2
  fi
}

assert_port_free "http://127.0.0.1:8732/healthz" "Mother"
assert_port_free "http://127.0.0.1:8731/healthz" "Agent"
if [[ "$RUN_DASHBOARD" -eq 1 ]]; then
  assert_port_free "http://127.0.0.1:8740/" "Dashboard"
fi

mkdir -p "$TMP/agent-data" "$TMP/mother-data" "$TMP/logs" "$TMP/policy-cache"

cat > "$TMP/mother.yml" <<EOF_MOTHER
mother:
  listen_addr: "127.0.0.1:8732"
  mode: "dev"
security:
  agent_shared_secret: ""
  require_signature: false
  allow_remote_bind: false
  signature_max_skew_seconds: 300
debug:
  enabled: false
management:
  enabled: true
  write_enabled: false
storage:
  engine: "memory"
  path: "$TMP/mother-data"
logging:
  level: "info"
  path: "$TMP/logs/unixsee-mother.log"
EOF_MOTHER

cat > "$TMP/agent.yml" <<EOF_AGENT
agent:
  id: "local-dev-agent"
  listen_addr: "127.0.0.1:8731"
  mode: "shadow"
security:
  shadow_secret: ""
  require_signature: false
  allow_remote_bind: false
storage:
  engine: "jsonl"
  path: "$TMP/agent-data/events"
  sync_writes: false
logging:
  level: "info"
  path: "$TMP/logs/unixsee-agent.log"
limits:
  max_body_bytes: 1048576
  request_timeout_ms: 500
decision:
  enabled: true
  mode: "comparator"
  default_action: "allow"
  compare_unknown: false
diagnostics:
  enabled: true
  recent_mismatch_limit: 20
  expose_recent_mismatches: true
  include_user_agent: false
  include_ip: false
mother:
  enabled: true
  base_url: "http://127.0.0.1:8732"
  agent_id: "local-dev-agent"
  shared_secret: ""
  require_signature: false
  policy_pull_timeout_ms: 500
  policy_refresh_seconds: 30
  use_last_known_good: true
  policy_cache_path: "$TMP/policy-cache/last-known-policy.json"
policy:
  source: "mother"
EOF_AGENT

wait_http() {
  local url="$1" name="$2" tries=60
  for _ in $(seq 1 "$tries"); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "PASS $name"
      return 0
    fi
    sleep 0.5
  done
  echo "FAIL $name" >&2
  echo "--- Mother log ---" >&2
  cat "$TMP/logs/unixsee-mother.log" 2>/dev/null || true
  echo "--- Agent log ---" >&2
  cat "$TMP/logs/unixsee-agent.log" 2>/dev/null || true
  return 1
}

json_get_number() {
  sed -E 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/' | grep -E '^[0-9]+$' || echo 0
}

echo "== start Mother =="
setsid bash -c 'cd "$1" && exec go run ./cmd/unixsee-mother --config "$2"' _ "$ROOT/mother" "$TMP/mother.yml" >"$TMP/mother.stdout" 2>"$TMP/mother.stderr" &
PIDS+=("$!")
wait_http "http://127.0.0.1:8732/healthz" "Mother /healthz"
wait_http "http://127.0.0.1:8732/readyz" "Mother /readyz"
curl -fsS "http://127.0.0.1:8732/v1/policies" >/dev/null
echo "PASS Mother /v1/policies"
curl -fsS "http://127.0.0.1:8732/v1/policies/default" >/dev/null
echo "PASS Mother /v1/policies/default"

echo "== start Agent =="
setsid bash -c 'cd "$1" && exec go run ./cmd/unixsee-agent --config "$2"' _ "$ROOT/agent" "$TMP/agent.yml" >"$TMP/agent.stdout" 2>"$TMP/agent.stderr" &
PIDS+=("$!")
wait_http "http://127.0.0.1:8731/healthz" "Agent /healthz"
wait_http "http://127.0.0.1:8731/readyz" "Agent /readyz"

for endpoint in /v1/policy/effective /v1/policy/sync-status /v1/stats /v1/comparison/diagnostics; do
  curl -fsS "http://127.0.0.1:8731$endpoint" >/dev/null
  echo "PASS Agent $endpoint"
done

before="$(curl -fsS http://127.0.0.1:8731/v1/stats | json_get_number received)"
cat > "$TMP/shadow.json" <<'EOF_PAYLOAD'
{
  "schema_version": "r3.shadow.v1",
  "timestamp": 1710000000,
  "site": {"host": "staging.local", "scheme": "https"},
  "request": {"ip": "127.0.0.1", "method": "GET", "path": "/product/smoke-test", "query": "", "user_agent": "unixsee-smoke-test", "referer": "", "accept": "application/json", "is_ajax": false},
  "php_decision": {"action": "allow", "reason": "smoke_test", "status": 200, "retry_after": 0},
  "runtime": {"storage_available": true, "storage_fail_mode": "open", "gateway_enabled": true, "campaign_enabled": true}
}
EOF_PAYLOAD
curl -fsS -X POST -H 'Content-Type: application/json' --data-binary "@$TMP/shadow.json" http://127.0.0.1:8731/v1/shadow/decision >/dev/null
sleep 0.5
after="$(curl -fsS http://127.0.0.1:8731/v1/stats | json_get_number received)"
if [[ "$after" -le "$before" ]]; then
  echo "FAIL Agent stats received did not increment: before=$before after=$after" >&2
  exit 1
fi
echo "PASS Agent stats received incremented: before=$before after=$after"

if [[ "$RUN_DASHBOARD" -eq 1 ]]; then
  echo "== start Dashboard =="
  setsid bash -c 'cd "$1" && UNIXSEE_AGENT_BASE_URL=http://127.0.0.1:8731 UNIXSEE_MOTHER_BASE_URL=http://127.0.0.1:8732 exec npm run dev' _ "$ROOT/dashboard" >"$TMP/dashboard.stdout" 2>"$TMP/dashboard.stderr" &
  PIDS+=("$!")
  wait_http "http://127.0.0.1:8740/" "Dashboard /"
  for page in /agents /alerts /release /policy /sync /diagnostics /mother; do
    curl -fsS "http://127.0.0.1:8740$page" >/dev/null
    echo "PASS Dashboard $page"
  done
fi

echo "Smoke test PASS"
