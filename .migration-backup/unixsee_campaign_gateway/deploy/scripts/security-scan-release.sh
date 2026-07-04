#!/usr/bin/env bash
set -euo pipefail
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
FAIL=0
pass(){ printf '[PASS] %s\n' "$*"; }
warn(){ printf '[WARN] %s\n' "$*"; }
fail(){ printf '[FAIL] %s\n' "$*"; FAIL=1; }

grep_tree(){ local pat="$1" dir="$2"; grep -RIE --exclude-dir=node_modules --exclude-dir=.git --exclude='*.zip' "$pat" "$dir" >/dev/null 2>&1; }

[[ -d "$ROOT/dashboard/.next/static" ]] && ! grep_tree 'UNIXSEE_MOTHER_MANAGEMENT_TOKEN|DASHBOARD_SESSION_SECRET|DASHBOARD_POSTGRES_DSN' "$ROOT/dashboard/.next/static" && pass "no dashboard secret env refs in static bundle" || warn "dashboard static bundle missing or contains secret env refs"
! grep_tree 'local-dev-agent' "$ROOT/dashboard/app" && pass "no local-dev-agent in production UI" || fail "local-dev-agent found in dashboard/app"
! grep_tree 'openai|artifactory|internal\.api' "$ROOT/dashboard/package-lock.json" && pass "package-lock public registry" || fail "internal registry reference found"
! grep_tree 'postgres://[^:[:space:]@]+:(admin|password|123456|prod-|real-)[^@]*@' "$ROOT/docs" && pass "no obvious DB password in docs" || fail "obvious DB password in docs"
! grep_tree 'panel\.unixsee\.|unixsee\.ir|pashalaser\.com' "$ROOT/deploy" && pass "no real deployment domain in examples" || fail "real domain found in deploy examples"
! grep_tree '0\.0\.0\.0.*8740|8740.*0\.0\.0\.0' "$ROOT/deploy/systemd" && pass "dashboard default local-only" || fail "dashboard public bind default found"
if grep_tree '0\.0\.0\.0:8732' "$ROOT/deploy"; then warn "Mother remote bind example exists; firewall restriction required"; else pass "Mother default remote bind absent"; fi
[[ -f "$ROOT/tools/uxgw_release_scan.php" ]] && php "$ROOT/tools/uxgw_release_scan.php" >/tmp/uxgw_release_scan.out && pass "release scan passed" || { cat /tmp/uxgw_release_scan.out 2>/dev/null || true; fail "release scan failed"; }
exit "$FAIL"
