#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
fail_count=0; warn_count=0
ok(){ printf '[PASS] %s\n' "$*"; }
warn2(){ printf '[WARN] %s\n' "$*"; warn_count=$((warn_count+1)); }
fail2(){ printf '[FAIL] %s\n' "$*"; fail_count=$((fail_count+1)); }

[[ -x "$BIN_DIR/unixsee-mother" ]] && ok "Mother binary exists" || warn2 "Mother binary not installed yet: $BIN_DIR/unixsee-mother"
[[ -x "$BIN_DIR/unixsee-agent" ]] && ok "Agent binary exists" || warn2 "Agent binary not installed yet: $BIN_DIR/unixsee-agent"
[[ -d "$PREFIX/dashboard" ]] && ok "Dashboard install dir exists" || warn2 "Dashboard install dir missing: $PREFIX/dashboard"
[[ -d "$STATE_DIR/mother" ]] && ok "Mother state dir exists" || warn2 "Mother state dir missing"
[[ -d "$STATE_DIR/dashboard" ]] && ok "Dashboard state dir exists" || warn2 "Dashboard state dir missing"
[[ -d "$STATE_DIR/agent" ]] && ok "Agent state dir exists" || warn2 "Agent state dir missing"

if [[ -n "${UXGW_WEBROOT:-}" ]]; then
  if "$SCRIPT_DIR/validate-php-wrapper-exposure.sh"; then ok "public wrapper exposure clean"; else fail2 "public wrapper exposure validation failed"; fi
else
  warn2 "UXGW_WEBROOT not set; skipped public wrapper exposure validation"
fi

if [[ -f "$PREFIX/dashboard/.next/static/chunks" ]]; then :; fi
if [[ -d "$PREFIX/dashboard/.next/static" ]]; then
  if grep -RIl -E 'UNIXSEE_MOTHER_MANAGEMENT_TOKEN|DASHBOARD_SESSION_SECRET|postgres://[^ ]+:[^ ]+@' "$PREFIX/dashboard/.next/static" 2>/dev/null | grep -q .; then
    fail2 "secret-like value/name found in browser static bundle"
  else
    ok "browser static bundle secret scan clean"
  fi
else
  warn2 "dashboard static bundle missing; build may not have run"
fi

if grep -RIl --exclude-dir=node_modules --exclude-dir=.next -E 'remote command|exec_shell|shell_command|enforce mode' "$PREFIX/dashboard" "$PREFIX/mother" "$PREFIX/agent" 2>/dev/null | grep -q .; then
  warn2 "review wording for forbidden feature terms; no runtime action taken by validator"
else
  ok "no obvious remote command/enforcement wording in runtime source"
fi

if [[ "${REPORT_JSON:-0}" == "1" ]]; then printf '{"fails":%d,"warnings":%d}\n' "$fail_count" "$warn_count"; fi
[[ "$fail_count" -eq 0 ]]
