#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup_generated() {
  rm -rf "$ROOT/dashboard/node_modules" "$ROOT/dashboard/.next" "$ROOT/dashboard/out"
  rm -rf "$ROOT/agent/bin" "$ROOT/agent/data" "$ROOT/agent/logs"
  rm -rf "$ROOT/mother/bin" "$ROOT/mother/data" "$ROOT/mother/logs"
  rm -f "$ROOT/agent/unixsee-agent" "$ROOT/mother/unixsee-mother"
}

cleanup_generated
trap cleanup_generated EXIT

missing=0
for tool in php go npm curl unzip; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "missing required tool: $tool" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 2
fi

echo "== PHP lint =="
while IFS= read -r -d '' file; do
  php -l "$file" >/dev/null
done < <(find "$ROOT" -type f -name '*.php' -not -path '*/dashboard/node_modules/*' -print0)

echo "== PHP self-test =="
(cd "$ROOT" && php tools/uxgw_selftest.php)

echo "== release scan =="
(cd "$ROOT" && php tools/uxgw_release_scan.php)

echo "== Agent tests/build =="
(cd "$ROOT/agent" && go test ./... && go build ./cmd/unixsee-agent && rm -f unixsee-agent)

echo "== Mother tests/build =="
(cd "$ROOT/mother" && go test ./... && go build ./cmd/unixsee-mother && rm -f unixsee-mother)

echo "== Dashboard npm/build =="
(cd "$ROOT/dashboard" && npm ci && npm audit && NEXT_TELEMETRY_DISABLED=1 npm run build)

echo "Validation PASS"
