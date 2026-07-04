#!/usr/bin/env bash
set -euo pipefail

PREFIX="/opt/unixsee-campaign-gateway"
MODE="dry-run"
DO_SYSTEMD=0

usage() {
  cat <<USAGE
Usage: install/uninstall-local-dev.sh [flags]

Safe local/dev uninstaller. Default is dry-run.

Flags:
  --dry-run          Print planned actions only (default)
  --apply            Apply removal under configured prefix only
  --prefix PATH      Install prefix (default: /opt/unixsee-campaign-gateway)
  --systemd          Stop/remove systemd templates only with --apply --systemd
  -h, --help         Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) MODE="dry-run"; shift ;;
    --apply) MODE="apply"; shift ;;
    --prefix) PREFIX="${2:-}"; shift 2 ;;
    --systemd) DO_SYSTEMD=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown flag: $1" >&2; usage; exit 2 ;;
  esac
done

validate_prefix() {
  local p="$1"

  [[ -n "$p" ]] || return 1
  [[ "$p" == /* ]] || return 1
  [[ "$p" != "/" ]] || return 1
  [[ "$p" != "/root" ]] || return 1
  [[ "$p" != "/home" ]] || return 1
  [[ "$p" != "/var/www" ]] || return 1
  [[ "$p" != *"public_html"* ]] || return 1
  [[ "$p" != *".."* ]] || return 1
  [[ "$p" != *$'\n'* ]] || return 1
  [[ "$p" != *$'\r'* ]] || return 1
  [[ "$p" != *"'"* ]] || return 1
  [[ "$p" != *'"'* ]] || return 1
  [[ "$p" != *";"* ]] || return 1
  [[ "$p" != *"&"* ]] || return 1
  [[ "$p" != *"|"* ]] || return 1

  case "$p" in
    /opt/unixsee-campaign-gateway|/opt/unixsee-campaign-gateway/*) return 0 ;;
    /usr/local/unixsee-campaign-gateway|/usr/local/unixsee-campaign-gateway/*) return 0 ;;
    /tmp/unixsee-campaign-gateway-test-*) return 0 ;;
    *) return 1 ;;
  esac
}

if ! validate_prefix "$PREFIX"; then
  echo "refusing unsafe prefix: $PREFIX" >&2
  echo "allowed prefixes: /opt/unixsee-campaign-gateway, /usr/local/unixsee-campaign-gateway, /tmp/unixsee-campaign-gateway-test-*" >&2
  exit 2
fi

say() { printf '[%s] %s\n' "$MODE" "$*"; }

cat <<NOTICE
Unixsee Campaign Gateway local/dev uninstaller
=============================================
Mode:        $MODE
Prefix:      $PREFIX
Systemd:     $DO_SYSTEMD

This uninstaller never deletes WordPress files, public_html, uploads, databases,
DB dumps, unrelated logs, or web server config. It only removes the configured
prefix and optional systemd templates when explicitly requested.
NOTICE

if [[ "$DO_SYSTEMD" -eq 1 ]]; then
  say "stop local Unixsee systemd services if they exist"
  if [[ "$MODE" == "apply" ]]; then
    systemctl stop unixsee-dashboard 2>/dev/null || true
    systemctl stop unixsee-agent 2>/dev/null || true
    systemctl stop unixsee-mother 2>/dev/null || true
    rm -f /etc/systemd/system/unixsee-dashboard.service /etc/systemd/system/unixsee-agent.service /etc/systemd/system/unixsee-mother.service
    systemctl daemon-reload
  fi
else
  say "skip systemd stop/remove; use --systemd with --apply if needed"
fi

say "rm -rf -- $PREFIX"
if [[ "$MODE" == "apply" ]]; then
  rm -rf -- "$PREFIX"
fi

echo "Done. PHP/WordPress files are intentionally untouched."
