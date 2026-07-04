#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:8740}"
STORE_PATH="${DASHBOARD_USER_STORE_PATH:-/var/lib/unixsee-gateway/dashboard}"

action_ok() { printf '[OK] %s\n' "$1"; }
action_fail() { printf '[FAIL] %s\n' "$1" >&2; exit 1; }

case "$STORE_PATH" in
  *public_html*|/|/root|/home|/var/www) action_fail "unsafe DASHBOARD_USER_STORE_PATH: $STORE_PATH" ;;
esac

if [[ -d "$STORE_PATH" ]]; then
  [[ -w "$STORE_PATH" ]] || action_fail "dashboard user store path exists but is not writable: $STORE_PATH"
  action_ok "dashboard user store path exists and is writable"
else
  action_ok "dashboard user store path does not exist yet; service bootstrap should create it with safe permissions"
fi

if [[ -f "$STORE_PATH/users.json" ]]; then
  grep -q '"users"' "$STORE_PATH/users.json" || action_fail "users.json does not look like dashboard user store"
  if grep -Eiq '"password"[[:space:]]*:[[:space:]]*"[^$]' "$STORE_PATH/users.json"; then
    action_fail "users.json appears to contain plaintext password field"
  fi
  action_ok "users.json present without plaintext password field"
else
  if [[ -z "${DASHBOARD_BOOTSTRAP_ADMIN_USERNAME:-${DASHBOARD_ADMIN_USERNAME:-}}" ]]; then
    action_fail "no users.json and no bootstrap admin username env configured"
  fi
  if [[ -z "${DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH:-${DASHBOARD_ADMIN_PASSWORD_HASH:-}}" ]]; then
    action_fail "no users.json and no bootstrap admin password hash env configured"
  fi
  action_ok "bootstrap admin env appears configured"
fi

if command -v curl >/dev/null 2>&1; then
  code="$(curl -ksS -o /tmp/uxgw-rbac-root.$$ -w '%{http_code}' "$DASHBOARD_URL/" || true)"
  rm -f /tmp/uxgw-rbac-root.$$
  case "$code" in
    200|302|303|307|308) action_ok "dashboard root responds with protected/login behavior: HTTP $code" ;;
    000) action_ok "dashboard not reachable; skipped live route checks" ;;
    *) action_fail "unexpected dashboard root HTTP $code" ;;
  esac
  for route in /users /audit; do
    code="$(curl -ksS -o /tmp/uxgw-rbac-route.$$ -w '%{http_code}' "$DASHBOARD_URL$route" || true)"
    rm -f /tmp/uxgw-rbac-route.$$
    case "$code" in
      200|302|303|307|308) action_ok "$route is protected/reachable: HTTP $code" ;;
      000) action_ok "dashboard not reachable; skipped $route" ;;
      *) action_fail "unexpected $route HTTP $code" ;;
    esac
  done
else
  action_ok "curl missing; skipped live dashboard checks"
fi

if [[ -d "$ROOT/dashboard/.next/static" ]]; then
  if grep -R "UNIXSEE_MOTHER_MANAGEMENT_TOKEN\|DASHBOARD_SESSION_SECRET\|DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH" "$ROOT/dashboard/.next/static" >/dev/null 2>&1; then
    action_fail "secret env names found in dashboard static bundle"
  fi
  action_ok "dashboard static bundle does not contain secret env names"
else
  action_ok "dashboard .next/static not present; skipped bundle scan"
fi

action_ok "RBAC validation completed"
