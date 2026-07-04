#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib-production.sh"
ROOT="${UXGW_SOURCE_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT
FAIL=0
mark_fail(){ printf '[FAIL] %s\n' "$*"; FAIL=1; }

if grep -RInE 'mode[[:space:]]*[:=][[:space:]]*["'"'']?enforce|default_action[[:space:]]*[:=][[:space:]]*["'"'']?block|enforcement_enabled[[:space:]]*[:=][[:space:]]*true' \
  "$ROOT/mother" "$ROOT/agent" "$ROOT/dashboard/app" "$ROOT/dashboard/components" "$ROOT/deploy/examples" 2>/dev/null \
  | grep -Ev 'ValidateControlConfig|must be shadow|shadow-only|enforcement_enabled": false' >/tmp/uxgw-shadow-scan.$$; then
  cat /tmp/uxgw-shadow-scan.$$ >&2
  mark_fail "enforce-like runtime/UI/config string found"
else
  pass "no enforcement runtime/UI/config path found"
fi
rm -f /tmp/uxgw-shadow-scan.$$

if grep -RInE 'remote shell|exec command|run command|command execution' "$ROOT/dashboard/app" "$ROOT/mother/internal" "$ROOT/agent" 2>/dev/null | grep -Ev 'no remote|without remote|not add remote' >/tmp/uxgw-remote-scan.$$; then
  cat /tmp/uxgw-remote-scan.$$ >&2
  mark_fail "remote command-like UI/runtime string found"
else
  pass "no remote command UI/runtime found"
fi
rm -f /tmp/uxgw-remote-scan.$$

if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 3 -H 'Accept: application/json' "$MOTHER_URL/v1/health/report" -o "$TMP_FILE"; then
  if grep -E '"mode"[[:space:]]*:[[:space:]]*"shadow"' "$TMP_FILE" >/dev/null; then pass "Mother health report confirms shadow mode"; else warn "Mother health report did not expose explicit shadow mode"; fi
else
  warn "Mother not reachable; active config shadow check skipped"
fi

[[ "$FAIL" -eq 0 ]]
