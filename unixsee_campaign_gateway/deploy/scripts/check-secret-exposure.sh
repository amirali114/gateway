#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
fail=0
report_hits() {
  local label="$1" file="$2"
  if [[ -s "$file" ]]; then
    echo "secret exposure pattern found in $label" >&2
    sed 's/:.*//' "$file" | sort -u | head -20 >&2
    fail=1
  fi
}
if [[ -d "$ROOT/dashboard/.next/static" ]]; then
  grep -RInE 'UNIXSEE_MOTHER_MANAGEMENT_TOKEN|DASHBOARD_SESSION_SECRET|postgres://[^:@]+:[^@]+@' "$ROOT/dashboard/.next/static" >/tmp/uxgw-static-scan.$$ 2>/dev/null || true
  report_hits "dashboard static bundle" /tmp/uxgw-static-scan.$$
  rm -f /tmp/uxgw-static-scan.$$
fi
if [[ -d "$ROOT/dashboard/.next/server" ]]; then
  grep -RInE 'postgres://[^:@]+:(admin|password|secret|123456)[^@]*@' "$ROOT/dashboard/.next/server" >/tmp/uxgw-server-scan.$$ 2>/dev/null || true
  report_hits "dashboard server bundle" /tmp/uxgw-server-scan.$$
  rm -f /tmp/uxgw-server-scan.$$
fi
for path in "$ROOT/docs" "$ROOT/deploy"; do
  [[ -d "$path" ]] || continue
  find "$path" -type f ! -path "*/deploy/scripts/check-secret-exposure.sh" -print0 \
    | xargs -0 grep -InE 'postgres://[^:@]+:(admin|password|123456|real-|prod-)[^@]*@|api_token:[[:space:]]*[^"#[:space:]]+' >/tmp/uxgw-doc-scan.$$ 2>/dev/null || true
  report_hits "$path" /tmp/uxgw-doc-scan.$$
  rm -f /tmp/uxgw-doc-scan.$$
done
if [[ -f "$ROOT/dashboard/package-lock.json" ]] && grep -Eiq 'openai|artifactory|internal\.api' "$ROOT/dashboard/package-lock.json"; then
  echo "internal registry detected in package-lock" >&2
  fail=1
fi
exit "$fail"
