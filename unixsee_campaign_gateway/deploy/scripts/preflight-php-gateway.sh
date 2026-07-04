#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib-production.sh"
GATEWAY_URL="${GATEWAY_URL:-}"
WEBROOT="${UXGW_WEBROOT:-}"
PRIVATE_RUNTIME="${UXGW_PHP_PRIVATE_RUNTIME:-$PREFIX/gateway.php}"
EXIT=0
say "PHP Gateway preflight"
command -v php >/dev/null 2>&1 && php -v | head -1 || { warn "php missing"; EXIT=1; }
php -m 2>/dev/null | grep -Eiq 'json' && pass "php json extension" || { warn "php json extension missing"; EXIT=1; }
[[ -n "$PRIVATE_RUNTIME" && -f "$PRIVATE_RUNTIME" ]] && pass "private runtime file exists" || warn "private runtime file not configured/missing"
[[ -n "$WEBROOT" && -d "$WEBROOT/unixsee-gateway" && -f "$WEBROOT/unixsee-gateway/gateway.php" ]] && pass "public wrapper exists" || warn "public wrapper missing"
if [[ -n "$GATEWAY_URL" ]]; then
  curl -fsS "$GATEWAY_URL" | grep -Eq '"status"\s*:\s*"pass"' && pass "Gateway returns pass" || warn "Gateway endpoint did not return status pass"
  for probe in src tools docs install logs; do
    code="$(curl -k -sS -o /dev/null -w '%{http_code}' "${GATEWAY_URL%/}/../$probe/" || true)"
    [[ "$code" == "403" || "$code" == "404" ]] && pass "probe $probe blocked" || warn "probe $probe returned $code"
  done
else
  warn "GATEWAY_URL not set; endpoint checks skipped"
fi
exit "$EXIT"
