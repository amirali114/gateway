#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:8740}"
DASHBOARD_PUBLIC_URL="${DASHBOARD_PUBLIC_URL:-}"
GATEWAY_URL="${GATEWAY_URL:-}"
AGENT_ID="${AGENT_ID:-}"
OUTPUT_DIR="${OUTPUT_DIR:-}"
REPORT_JSON="${REPORT_JSON:-0}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

need_bin curl
need_bin grep

redact_file() {
  local file="$1"
  sed -E 's/(Authorization:[[:space:]]*Bearer[[:space:]]+)[^[:space:]]+/\1[redacted]/Ig; s/(Cookie:[[:space:]]*)[^[:cntrl:]]+/\1[redacted]/Ig; s#(postgres://[^:/@]+:)[^@]+@#\1[redacted]@#Ig; s/(api[_-]?token|session[_-]?secret|password|cookie|dsn)("?[[:space:]]*[:=][[:space:]]*"?)[A-Za-z0-9_./:+@%-]{12,}/\1\2[redacted]/Ig' "$file" > "$file.redacted"
  mv "$file.redacted" "$file"
}

json_get() {
  local path="$1" out="$2" label="$3"
  if curl -fsS --max-time 5 -H 'Accept: application/json' "$MOTHER_URL$path" -o "$out"; then
    redact_file "$out"
    pass "$label"
  else
    warn "$label unavailable"
    printf '{"ok":false,"error":"unavailable","path":"%s"}\n' "$path" > "$out"
  fi
}

text_out="$TMP_DIR/release-evidence.txt"
json_out="$TMP_DIR/release-evidence.json"
{
  echo "Unixsee Campaign Gateway R10.3 release evidence"
  echo "generated_at=$(date -u +%FT%TZ)"
  echo "package_version=R10.3 controlled beta staging hardening"
  echo "prefix=$PREFIX"
  echo "bin_dir=$BIN_DIR"
  echo "etc_dir=$ETC_DIR"
  echo "state_dir=$STATE_DIR"
  echo "log_dir=$LOG_DIR"
  echo "mother_url=$MOTHER_URL"
  echo "dashboard_url=$DASHBOARD_URL"
  [[ -n "$DASHBOARD_PUBLIC_URL" ]] && echo "dashboard_public_url=$DASHBOARD_PUBLIC_URL"
  [[ -n "$GATEWAY_URL" ]] && echo "gateway_url=$GATEWAY_URL"
  echo
  echo "== systemd summary =="
  for unit in unixsee-mother.service unixsee-dashboard.service unixsee-agent.service; do
    if command -v systemctl >/dev/null 2>&1; then
      state="$(systemctl is-active "$unit" 2>/dev/null || true)"
      enabled="$(systemctl is-enabled "$unit" 2>/dev/null || true)"
      echo "$unit active=$state enabled=$enabled"
    else
      echo "$unit systemctl_unavailable"
    fi
  done
  echo
  echo "== bind summary =="
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep -E ':(8731|8732|8740)\b' || true
  else
    echo "ss_unavailable"
  fi
} > "$text_out"

json_get '/healthz' "$TMP_DIR/mother-healthz.json" 'Mother healthz evidence'
json_get '/readyz' "$TMP_DIR/mother-readyz.json" 'Mother readyz evidence'
json_get '/v1/storage/status' "$TMP_DIR/storage-status.json" 'storage status evidence'
json_get '/v1/health/report' "$TMP_DIR/health-report.json" 'health report evidence'
json_get '/v1/alerts/summary' "$TMP_DIR/alerts-summary.json" 'alert summary evidence'
json_get '/v1/agents' "$TMP_DIR/agents.json" 'agents evidence'
json_get '/v1/diagnostics/summary' "$TMP_DIR/diagnostics-summary.json" 'diagnostics summary evidence'
json_get '/v1/release-gates/summary' "$TMP_DIR/release-gates-summary.json" 'release gate summary evidence'

if curl -fsS --max-time 5 -I "$DASHBOARD_URL/login" > "$TMP_DIR/dashboard-auth.headers" 2>/dev/null; then
  redact_file "$TMP_DIR/dashboard-auth.headers"
  pass "dashboard auth check evidence"
else
  warn "dashboard auth check unavailable"
fi

if [[ -n "$GATEWAY_URL" ]]; then
  if curl -fsS --max-time 5 -H 'Accept: application/json' "$GATEWAY_URL" -o "$TMP_DIR/gateway-endpoint.json"; then
    redact_file "$TMP_DIR/gateway-endpoint.json"
    pass "PHP Gateway endpoint evidence"
  else
    warn "PHP Gateway endpoint unavailable"
  fi
fi

if [[ -n "$AGENT_ID" ]]; then
  json_get "/v1/agents/$AGENT_ID" "$TMP_DIR/agent-$AGENT_ID.json" "agent detail evidence"
fi

cat > "$json_out" <<JSON
{
  "ok": true,
  "generated_at": "$(date -u +%FT%TZ)",
  "version": "R10.3",
  "mother_url": "$MOTHER_URL",
  "dashboard_url": "$DASHBOARD_URL",
  "dashboard_public_url_configured": $([[ -n "$DASHBOARD_PUBLIC_URL" ]] && echo true || echo false),
  "gateway_url_configured": $([[ -n "$GATEWAY_URL" ]] && echo true || echo false),
  "artifacts_dir": "${OUTPUT_DIR:-temporary}",
  "notes": "Detailed safe evidence files are collected separately; secrets are redacted."
}
JSON

if [[ -n "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR"
  cp "$text_out" "$OUTPUT_DIR/release-evidence.txt"
  cp "$json_out" "$OUTPUT_DIR/release-evidence.json"
  cp "$TMP_DIR"/*.json "$OUTPUT_DIR/" 2>/dev/null || true
  cp "$TMP_DIR"/*.headers "$OUTPUT_DIR/" 2>/dev/null || true
  pass "release evidence written to $OUTPUT_DIR"
fi

if [[ "$REPORT_JSON" == "1" ]]; then
  cat "$json_out"
else
  cat "$text_out"
fi
