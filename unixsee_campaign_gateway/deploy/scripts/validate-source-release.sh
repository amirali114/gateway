#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${UXGW_SOURCE_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
fail_count=0
ok(){ printf '[PASS] %s\n' "$*"; }
warn(){ printf '[WARN] %s\n' "$*"; }
fail(){ printf '[FAIL] %s\n' "$*"; fail_count=$((fail_count+1)); }

[[ -d "$ROOT" ]] || { echo '[FAIL] source root missing'; exit 1; }
if find "$ROOT" -path '*/node_modules/*' -print -quit | grep -q .; then fail 'node_modules found in source release'; else ok 'no node_modules in source release'; fi
if find "$ROOT" -path '*/.next/*' -print -quit | grep -q .; then fail '.next found in source release'; else ok 'no .next in source release'; fi
if find "$ROOT" -type f \
  -not -path '*/.git/*' \
  -not -path '*/deploy/scripts/*' \
  -not -path '*/tools/uxgw_release_scan.php' \
  -not -name 'package-lock.json' \
  -print0 \
  | xargs -0 grep -IlE 'artifactory|registry\.npmjs\.org/.+_authToken|BEGIN RSA PRIVATE KEY|BEGIN OPENSSH PRIVATE KEY' 2>/dev/null | grep -q .; then
  fail 'possible committed secret/internal registry reference'
else
  ok 'no obvious committed secret/internal registry reference'
fi
if find "$ROOT/deploy/php-wrapper" -type f -name gateway.php -size +8k -print -quit | grep -q .; then fail 'public wrapper is too large'; else ok 'public wrapper is minimal'; fi
if [[ -f "$ROOT/deploy/php-wrapper/gateway.php" ]] && grep -Eq 'ux_admin_panel|ux_storage|smart_modules|node_modules' "$ROOT/deploy/php-wrapper/gateway.php"; then fail 'public wrapper references private modules directly'; else ok 'public wrapper does not embed private modules'; fi
if find "$ROOT" -type f \( -name '*.sqlite' -o -name '*.db' -o -name '*.log' -o -name '.env' \) -not -path '*/.git/*' -not -name '.env.example' -print -quit | grep -q .; then fail 'runtime state/secrets found in source release'; else ok 'no runtime state/secrets in source release'; fi
if [[ "${REPORT_JSON:-0}" == "1" ]]; then printf '{"fails":%d}\n' "$fail_count"; fi
[[ "$fail_count" -eq 0 ]]
