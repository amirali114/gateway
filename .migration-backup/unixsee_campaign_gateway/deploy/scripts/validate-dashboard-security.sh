#!/usr/bin/env bash
set -euo pipefail

DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:8740}"
PROXY_URL="${PROXY_URL:-}"
fail=0

say() { printf '%s\n' "$*"; }
pass() { say "[OK] $*"; }
warn() { say "[WARN] $*"; }
fail_msg() { say "[FAIL] $*"; fail=1; }

say "Unixsee Dashboard security validation"
say "====================================="

login_headers="$(mktemp)"
root_headers="$(mktemp)"
trap 'rm -f "$login_headers" "$root_headers"' EXIT

curl -sS -D "$root_headers" -o /dev/null "$DASHBOARD_URL/" >/dev/null 2>&1 || true
status="$(awk 'toupper($0) ~ /^HTTP\// {code=$2} END{print code}' "$root_headers")"
loc="$(awk 'tolower($1)=="location:" {print $2}' "$root_headers" | tr -d '\r' | tail -1)"
if [[ "$status" =~ ^30[1278]$ && "$loc" == *"/login"* ]]; then
  pass "protected root redirects to login"
elif [[ "$status" == "200" ]]; then
  warn "/ returned 200; auth may be disabled or session already present"
else
  warn "root redirect not verified"
fi

if curl -fsS -D "$login_headers" -o /dev/null "$DASHBOARD_URL/login" 2>/dev/null; then
  pass "login page loads"
else
  fail_msg "login page did not load"
fi

if curl -fsS -I "$DASHBOARD_URL/logout" 2>/dev/null | grep -i '^set-cookie:' | grep -i 'Max-Age=0' >/dev/null; then
  pass "logout clears session cookie"
else
  warn "logout cookie clearing not verified"
fi

if [[ -n "$PROXY_URL" ]]; then
  headers="$(curl -fsS -I "$PROXY_URL/login" 2>/dev/null || true)"
  for h in X-Frame-Options X-Content-Type-Options Referrer-Policy Permissions-Policy Content-Security-Policy; do
    if echo "$headers" | grep -i "^$h:" >/dev/null; then pass "security header present: $h"; else fail_msg "missing security header through proxy: $h"; fi
  done
else
  warn "PROXY_URL not set; skipping reverse-proxy security header check"
fi

exit "$fail"
