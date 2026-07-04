#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
POSTGRES_ENABLED="${POSTGRES_ENABLED:-0}"
EXIT=0
check() { "$@" && pass "$*" || { warn "$*"; EXIT=1; }; }

say "Core preflight for Unixsee Mother/Dashboard"
[[ -r /etc/os-release ]] && . /etc/os-release && say "OS: ${PRETTY_NAME:-unknown}"
for b in systemctl curl unzip rsync; do command -v "$b" >/dev/null 2>&1 && pass "binary $b" || { warn "missing $b"; EXIT=1; }; done
command -v go >/dev/null 2>&1 && pass "go available" || warn "go unavailable; source build disabled"
command -v npm >/dev/null 2>&1 && pass "npm available" || warn "npm unavailable; dashboard source build disabled"
for p in 8732 8740; do ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${p}$" && warn "port $p already listening" || pass "port $p no conflict detected"; done
for d in "$STATE_DIR/mother" "$STATE_DIR/dashboard" "$LOG_DIR"; do [[ -d "$d" && -w "$d" ]] && pass "writable $d" || { warn "not writable/missing $d"; EXIT=1; }; done
[[ -r "$ETC_DIR/mother.yml" ]] && pass "mother.yml readable" || { warn "mother.yml missing/unreadable"; EXIT=1; }
[[ -r "$ETC_DIR/mother.env" ]] && pass "mother.env readable" || warn "mother.env missing"
[[ -r "$ETC_DIR/dashboard.env" ]] && pass "dashboard.env readable" || warn "dashboard.env missing"
curl -fsS "$MOTHER_URL/healthz" >/dev/null 2>&1 && pass "Mother health reachable" || warn "Mother health not reachable yet"
if [[ "$POSTGRES_ENABLED" == "1" ]]; then
  curl -fsS "$MOTHER_URL/v1/storage/status" | grep -q '"engine":"postgres"' && pass "PostgreSQL storage reported" || { warn "PostgreSQL storage not reported"; EXIT=1; }
fi
exit "$EXIT"
