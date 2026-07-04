#!/usr/bin/env bash
# Shared safe helpers for Unixsee Campaign Gateway deployment scripts.
set -euo pipefail

DRY_RUN="${DRY_RUN:-1}"
CHECK_ONLY="${CHECK_ONLY:-0}"
APPLY="${APPLY:-0}"
ENABLE_SERVICES="${ENABLE_SERVICES:-0}"
START_SERVICES="${START_SERVICES:-0}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

PREFIX="${UXGW_PREFIX:-/opt/unixsee-campaign-gateway/unixsee_campaign_gateway}"
BIN_DIR="${UXGW_BIN_DIR:-/opt/unixsee-campaign-gateway/bin}"
ETC_DIR="${UXGW_ETC_DIR:-/etc/unixsee-gateway}"
STATE_DIR="${UXGW_STATE_DIR:-/var/lib/unixsee-gateway}"
LOG_DIR="${UXGW_LOG_DIR:-/var/log/unixsee-gateway}"
BACKUP_DIR="${UXGW_BACKUP_DIR:-/var/backups/unixsee-gateway}"
SERVICE_USER="${UXGW_SERVICE_USER:-unixsee}"
AGENT_USER="${UXGW_AGENT_USER:-unixsee-agent}"

[[ "$APPLY" == "1" || "$DRY_RUN" == "0" ]] && DRY_RUN=0 || DRY_RUN=1

say() { printf '%s\n' "$*"; }
pass() { printf '[PASS] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; }
fail() { printf '[FAIL] %s\n' "$*"; return 1; }

safe_abs_path() {
  local p="${1:-}"
  [[ -n "$p" ]] || return 1
  [[ "$p" == /* ]] || return 1
  [[ "$p" != "/" ]] || return 1
  [[ "$p" != "/root" ]] || return 1
  [[ "$p" != "/home" ]] || return 1
  [[ "$p" != *".."* ]] || return 1
  [[ "$p" != *$'\n'* && "$p" != *$'\r'* ]] || return 1
}

safe_webroot_path() {
  local p="${1:-}"
  safe_abs_path "$p" || return 1
  [[ "$p" != "/var" && "$p" != "/var/www" && "$p" != "/home" ]] || return 1
}

is_under_path() {
  local child="$1" parent="$2"
  child="$(cd "$child" 2>/dev/null && pwd -P || printf '%s' "$child")"
  parent="$(cd "$parent" 2>/dev/null && pwd -P || printf '%s' "$parent")"
  [[ "$child" == "$parent" || "$child" == "$parent/"* ]]
}

run_cmd() {
  say "+ $*"
  if [[ "$DRY_RUN" == "1" || "$CHECK_ONLY" == "1" ]]; then
    return 0
  fi
  "$@"
}

need_bin() { command -v "$1" >/dev/null 2>&1 || fail "missing required binary: $1"; }

ensure_dir() {
  local dir="$1" mode="${2:-0750}" owner="${3:-}"
  safe_abs_path "$dir" || fail "unsafe directory: $dir"
  if [[ -n "$owner" ]]; then
    run_cmd install -d -m "$mode" -o "$owner" -g "$owner" "$dir"
  else
    run_cmd install -d -m "$mode" "$dir"
  fi
}

backup_path() {
  local src="$1" name="$2"
  safe_abs_path "$BACKUP_DIR" || fail "unsafe BACKUP_DIR"
  [[ -e "$src" ]] || { warn "backup source missing: $src"; return 0; }
  run_cmd mkdir -p "$BACKUP_DIR/$TS"
  run_cmd tar -C / -czf "$BACKUP_DIR/$TS/${name}.tar.gz" "${src#/}"
}

copy_if_missing() {
  local src="$1" dst="$2" mode="${3:-0640}"
  [[ -f "$src" ]] || fail "missing example source: $src"
  if [[ -e "$dst" ]]; then
    warn "preserve existing file: $dst"
    return 0
  fi
  run_cmd install -m "$mode" "$src" "$dst"
}

copy_tree_preserve() {
  local src="$1" dst="$2"
  [[ -d "$src" ]] || fail "source directory missing: $src"
  safe_abs_path "$dst" || fail "unsafe destination: $dst"
  run_cmd mkdir -p "$dst"
  run_cmd rsync -a --delete \
    --exclude 'dashboard/node_modules/' \
    --exclude 'dashboard/.next/' \
    --exclude 'agent/data/' \
    --exclude 'mother/data/' \
    --exclude '.env' \
    --exclude '*.sqlite' \
    --exclude '*.db' \
    --exclude '*.log' \
    "$src/" "$dst/"
}

install_systemd_unit() {
  local src="$1" dst="/etc/systemd/system/$2"
  [[ -f "$src" ]] || fail "missing systemd unit source: $src"
  if [[ "$APPLY" != "1" && "$DRY_RUN" != "0" ]]; then
    warn "systemd install skipped without APPLY=1: $dst"
    return 0
  fi
  backup_path "$dst" "systemd-${2}-before-install"
  run_cmd install -m 0644 "$src" "$dst"
  run_cmd systemctl daemon-reload
  [[ "$ENABLE_SERVICES" == "1" ]] && run_cmd systemctl enable "$2" || true
  [[ "$START_SERVICES" == "1" ]] && run_cmd systemctl restart "$2" || true
}

validate_no_forbidden_webroot_files() {
  local webroot="$1" wrapper_dir="${2:-unixsee-gateway}"
  safe_webroot_path "$webroot" || fail "unsafe webroot: $webroot"
  [[ -d "$webroot" ]] || fail "webroot missing: $webroot"
  local forbidden=(
    ux_config.php ux_admin_panel.php ux_admin.php admin.php ux_analytics.sqlite logs src tools docs install mother agent dashboard core smart_modules ux_gateway
    '*.sqlite' '*.db' '*.log' '*.yml' '*.yaml' '*.env' '*.bak' '*.md' package.json package-lock.json node_modules .next
  )
  local found=0 pattern
  for pattern in "${forbidden[@]}"; do
    while IFS= read -r hit; do
      [[ -z "$hit" ]] && continue
      found=1
      printf '[FAIL] forbidden public webroot artifact: %s\n' "$hit"
    done < <(find "$webroot" -mindepth 1 -maxdepth 4 -name "$pattern" -print 2>/dev/null | grep -v "/${wrapper_dir}/gateway.php$" || true)
  done
  [[ "$found" == "0" ]] || return 1
  pass "public webroot hard-fail scan clean: $webroot"
}
