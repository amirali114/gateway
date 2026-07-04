#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"

WEBROOT="${WEBROOT:-}"
WRAPPER_DIR="${WRAPPER_DIR:-unixsee-gateway}"
DASHBOARD_PUBLIC_URL="${DASHBOARD_PUBLIC_URL:-}"
MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
AGENT_HOST="${AGENT_HOST:-127.0.0.1}"
FAIL=0
mark_fail(){ printf '[FAIL] %s\n' "$*"; FAIL=1; }

if [[ -n "$WEBROOT" ]]; then
  validate_no_forbidden_webroot_files "$WEBROOT" "$WRAPPER_DIR" || FAIL=1
  [[ -f "$WEBROOT/$WRAPPER_DIR/gateway.php" || -f "$WEBROOT/gateway.php" ]] && pass "public wrapper file exists" || mark_fail "public wrapper file missing"
else
  warn "WEBROOT not provided; webroot hardening scan skipped"
fi

if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -E '0\.0\.0\.0:8731|\[::\]:8731' >/dev/null; then mark_fail "Agent appears publicly bound on 8731"; else pass "Agent public bind not detected"; fi
  if ss -ltn 2>/dev/null | grep -E '0\.0\.0\.0:8740|\[::\]:8740' >/dev/null; then warn "Dashboard 8740 appears public; ensure reverse proxy/auth/HTTPS or bind local-only"; else pass "Dashboard direct public bind not detected"; fi
  if ss -ltn 2>/dev/null | grep -E '0\.0\.0\.0:8732|\[::\]:8732' >/dev/null; then warn "Mother remote bind detected; firewall allowlist required"; else pass "Mother direct public bind not detected"; fi
else
  warn "ss unavailable; bind checks skipped"
fi

if [[ -n "$DASHBOARD_PUBLIC_URL" ]]; then
  [[ "$DASHBOARD_PUBLIC_URL" == https://* ]] || mark_fail "public Dashboard URL must use HTTPS"
  if command -v curl >/dev/null 2>&1 && curl -k -fsSI --max-time 5 "$DASHBOARD_PUBLIC_URL" > /tmp/uxgw-dashboard-headers.$$; then
    grep -Ei 'strict-transport-security|x-frame-options|content-security-policy|x-content-type-options' /tmp/uxgw-dashboard-headers.$$ >/dev/null && pass "some security headers detected" || warn "security headers not detected"
    grep -Ei '^set-cookie:.*(HttpOnly|Secure|SameSite)' /tmp/uxgw-dashboard-headers.$$ >/dev/null && pass "secure cookie attribute detected" || warn "secure cookie attribute not detected on HEAD response"
  else
    warn "could not fetch public Dashboard URL"
  fi
  rm -f /tmp/uxgw-dashboard-headers.$$
else
  warn "DASHBOARD_PUBLIC_URL not provided; reverse proxy/header checks skipped"
fi

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 3 -H 'Accept: application/json' "$MOTHER_URL/healthz" >/dev/null && pass "Mother health reachable from validation host" || warn "Mother health not reachable from validation host"
fi
[[ "$FAIL" -eq 0 ]]
