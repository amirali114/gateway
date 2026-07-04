#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
MOTHER_URL="${MOTHER_URL:-}"
EXIT=0
say "Agent preflight"
ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)8731$' && warn "port 8731 already listening" || pass "port 8731 available"
if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq '(0\.0\.0\.0|\[::\]):8731$'; then warn "Agent appears publicly bound"; EXIT=1; else pass "Agent public bind not detected"; fi
[[ -n "$MOTHER_URL" ]] && curl -fsS "$MOTHER_URL/healthz" >/dev/null 2>&1 && pass "Mother reachable" || warn "Mother URL not set/reachable"
[[ -r "$ETC_DIR/agent.yml" ]] && pass "agent.yml readable" || { warn "agent.yml missing"; EXIT=1; }
[[ -r "$ETC_DIR/mother-agent.secret" ]] && pass "mother-agent secret present" || { warn "mother-agent secret missing"; EXIT=1; }
for d in "$STATE_DIR/agent" "$LOG_DIR"; do [[ -d "$d" && -w "$d" ]] && pass "writable $d" || { warn "not writable/missing $d"; EXIT=1; }; done
say "DNS resolver report: $(getent hosts example.com >/dev/null 2>&1 && echo ok || echo unresolved)"
exit "$EXIT"
