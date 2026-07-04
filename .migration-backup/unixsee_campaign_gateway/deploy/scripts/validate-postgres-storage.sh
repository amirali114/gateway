#!/usr/bin/env bash
set -euo pipefail
MOTHER_URL="${MOTHER_URL:-http://127.0.0.1:8732}"
EXPECTED_ENGINE="${EXPECTED_ENGINE:-}"
require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1" >&2; exit 2; }; }
require_cmd curl
require_cmd grep
json="$(curl -fsS "$MOTHER_URL/v1/storage/status")"
echo "$json" | grep -q '"ok"' || { echo "storage status did not return JSON" >&2; exit 1; }
if echo "$json" | grep -Eqi '(password|passwd|pwd)=[^x ]|://[^:@]+:[^x][^@]*@'; then
  echo "possible secret exposure in storage status" >&2
  exit 1
fi
engine="$(printf '%s' "$json" | sed -n 's/.*"engine"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [[ -n "$EXPECTED_ENGINE" && "$engine" != "$EXPECTED_ENGINE" ]]; then
  echo "unexpected storage engine: $engine (expected $EXPECTED_ENGINE)" >&2
  exit 1
fi
if [[ "$engine" == "postgres" ]]; then
  echo "$json" | grep -q '"database_connected"[[:space:]]*:[[:space:]]*true' || { echo "postgres engine is not connected" >&2; exit 1; }
  echo "$json" | grep -q '"schema_version"' || { echo "schema_version missing" >&2; exit 1; }
else
  echo "storage engine is $engine; PostgreSQL is optional and not active"
fi
if [[ "${TEST_MODE:-0}" == "1" ]]; then
  echo "TEST_MODE=1 is non-destructive in this script; create draft/publish smoke checks in a disposable environment only."
fi
echo "postgres storage validation passed"
