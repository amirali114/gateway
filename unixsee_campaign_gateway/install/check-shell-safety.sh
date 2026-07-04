#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "$ROOT/install/install-local-dev.sh"
  "$ROOT/install/uninstall-local-dev.sh"
  "$ROOT/install/validate-package.sh"
  "$ROOT/install/run-smoke-test.sh"
)

fail=0
word_e="e""val"

for script in "${TARGETS[@]}"; do
  rel="${script#$ROOT/}"
  if [[ ! -f "$script" ]]; then
    echo "FAIL missing script: $rel" >&2
    fail=1
    continue
  fi
  if grep -nE "(^|[^A-Za-z0-9_])${word_e}([^A-Za-z0-9_]|$)" "$script" >/dev/null; then
    echo "FAIL unsafe command execution word found in $rel" >&2
    fail=1
  fi
  if grep -n '`' "$script" >/dev/null; then
    echo "FAIL backtick command substitution found in $rel" >&2
    fail=1
  fi
  if grep -nE 'rm[[:space:]]+-rf[[:space:]]+/' "$script" >/dev/null; then
    echo "FAIL absolute root-style rm -rf found in $rel" >&2
    fail=1
  fi
  if grep -nE 'rm[[:space:]]+-rf[[:space:]]+--[[:space:]]+"\$PREFIX"' "$script" >/dev/null; then
    if ! grep -q 'validate_prefix' "$script"; then
      echo "FAIL PREFIX removal without validate_prefix in $rel" >&2
      fail=1
    fi
  fi
  if [[ "$rel" == "install/install-local-dev.sh" || "$rel" == "install/uninstall-local-dev.sh" ]]; then
    if ! grep -q 'validate_prefix' "$script"; then
      echo "FAIL missing validate_prefix in $rel" >&2
      fail=1
    fi
  fi

done

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "Shell safety check PASS"
