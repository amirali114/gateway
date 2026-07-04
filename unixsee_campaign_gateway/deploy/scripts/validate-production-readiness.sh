#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Unixsee production readiness validation (installed runtime + R10.3 beta gates)."
FAIL=0
run_check(){ local name="$1"; shift; echo "== $name =="; if "$@"; then echo "[PASS] $name"; else echo "[WARN] $name returned non-zero; review output above"; FAIL=$((FAIL+1)); fi; }
run_optional(){ local name="$1"; shift; echo "== $name =="; if "$@"; then echo "[PASS] $name"; else echo "[WARN] $name skipped/failed in this environment; review output above"; fi; }
run_optional "core preflight" "$SCRIPT_DIR/preflight-core.sh"
run_optional "agent preflight" "$SCRIPT_DIR/preflight-agent.sh"
run_optional "php gateway preflight" "$SCRIPT_DIR/preflight-php-gateway.sh"
run_check "installed runtime validation" "$SCRIPT_DIR/validate-installed-runtime.sh"
run_optional "observability validation" "$SCRIPT_DIR/validate-observability.sh"
run_check "shadow-only safety" "$SCRIPT_DIR/validate-shadow-only-safety.sh"
run_optional "public exposure hardening" "$SCRIPT_DIR/validate-public-exposure-hardening.sh"
run_optional "release evidence collection" "$SCRIPT_DIR/collect-release-evidence.sh"
if [[ -n "${CORE_BACKUP_ARCHIVE:-}" ]]; then run_optional "core backup/restore drill" env ARCHIVE="$CORE_BACKUP_ARCHIVE" "$SCRIPT_DIR/drill-backup-restore-core.sh"; else echo "[WARN] core backup/restore drill skipped; CORE_BACKUP_ARCHIVE not provided"; fi
if [[ -n "${CLIENT_BACKUP_ARCHIVE:-}" ]]; then run_optional "client backup/restore drill" env ARCHIVE="$CLIENT_BACKUP_ARCHIVE" "$SCRIPT_DIR/drill-backup-restore-client.sh"; else echo "[WARN] client backup/restore drill skipped; CLIENT_BACKUP_ARCHIVE not provided"; fi
if [[ "$FAIL" -gt 0 ]]; then echo "[FAIL] production readiness has blockers/warnings requiring review: $FAIL"; exit 1; fi
echo "[PASS] production readiness validation completed"
