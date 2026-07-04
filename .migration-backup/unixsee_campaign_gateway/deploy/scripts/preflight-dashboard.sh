#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fail=0

say() { printf '%s\n' "$*"; }
check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    say "[OK] $1 found"
  else
    say "[FAIL] $1 missing"
    fail=1
  fi
}

say "Unixsee Dashboard preflight"
say "============================"
for cmd in php go npm curl grep unzip; do check_cmd "$cmd"; done

if [[ -d "$ROOT/dashboard" ]]; then say "[OK] dashboard/ present"; else say "[FAIL] dashboard/ missing"; fail=1; fi
if [[ -f "$ROOT/dashboard/.env.example" ]]; then say "[OK] dashboard/.env.example present"; else say "[FAIL] dashboard/.env.example missing"; fail=1; fi
if grep -R "0.0.0.0:8740" "$ROOT/dashboard" "$ROOT/deploy/systemd" >/dev/null 2>&1; then
  say "[FAIL] dashboard public bind found"
  fail=1
else
  say "[OK] dashboard public bind default not found"
fi

say "Do not expose Dashboard without HTTPS/reverse proxy and auth."
exit "$fail"
