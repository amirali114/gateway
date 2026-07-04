#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFIX="/opt/unixsee-campaign-gateway"
MODE="dry-run"
DO_BUILD=0
DO_SYSTEMD=0
DO_SYSTEM_USER=0
DO_DASHBOARD=0
USER_NAME="unixsee-cgw"

usage() {
  cat <<USAGE
Usage: install/install-local-dev.sh [flags]

Safe local/dev installer for Unixsee Campaign Gateway.
Default is dry-run. Nothing is written unless --apply is passed.

Flags:
  --dry-run                 Print planned actions only (default)
  --apply                   Apply filesystem/system changes
  --prefix PATH             Install prefix (default: /opt/unixsee-campaign-gateway)
  --build                   Build Go binaries before copying
  --systemd                 Install systemd service templates only with --apply
  --system-user             Create system user only with --apply --system-user
  --dashboard               Include dashboard source/config in install
  --no-dashboard            Do not include dashboard source/config (default)
  -h, --help                Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) MODE="dry-run"; shift ;;
    --apply) MODE="apply"; shift ;;
    --prefix) PREFIX="${2:-}"; shift 2 ;;
    --build) DO_BUILD=1; shift ;;
    --systemd) DO_SYSTEMD=1; shift ;;
    --system-user) DO_SYSTEM_USER=1; shift ;;
    --dashboard) DO_DASHBOARD=1; shift ;;
    --no-dashboard) DO_DASHBOARD=0; shift ;;
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

copy_file() {
  local src="$1" dst="$2"
  say "install -m 0644 $src $dst"
  if [[ "$MODE" == "apply" ]]; then
    install -D -m 0644 "$src" "$dst"
  fi
}
copy_exec() {
  local src="$1" dst="$2"
  say "install -m 0755 $src $dst"
  if [[ "$MODE" == "apply" ]]; then
    install -D -m 0755 "$src" "$dst"
  fi
}

cat <<NOTICE
Unixsee Campaign Gateway local/dev installer
===========================================
Mode:           $MODE
Prefix:         $PREFIX
Build:          $DO_BUILD
Systemd:        $DO_SYSTEMD
System user:    $DO_SYSTEM_USER
Dashboard:      $DO_DASHBOARD
Bind policy:    127.0.0.1 only

This installer does NOT modify web server config, WordPress/public_html, .htaccess,
cron, sudoers, PHP enforcement, or production services.
NOTICE

if [[ "$MODE" == "dry-run" ]]; then
  echo "Dry-run only. Re-run with --apply to write files."
fi

if [[ "$DO_SYSTEM_USER" -eq 1 ]]; then
  say "create system user $USER_NAME if missing"
  if [[ "$MODE" == "apply" ]]; then
    if ! id "$USER_NAME" >/dev/null 2>&1; then
      useradd --system --home-dir "$PREFIX" --shell /usr/sbin/nologin "$USER_NAME"
    fi
  fi
fi

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$PREFIX" "$PREFIX/bin" "$PREFIX/etc" "$PREFIX/logs" "$PREFIX/run" "$PREFIX/data/agent" "$PREFIX/data/mother"
fi
say "create local runtime dirs under $PREFIX only"

if [[ "$DO_BUILD" -eq 1 ]]; then
  say "build Agent and Mother Go binaries"
  if [[ "$MODE" == "apply" ]]; then
    (cd "$ROOT/agent" && go build -o "$PREFIX/bin/unixsee-agent" ./cmd/unixsee-agent)
    (cd "$ROOT/mother" && go build -o "$PREFIX/bin/unixsee-mother" ./cmd/unixsee-mother)
  fi
else
  say "skip build; use --build to compile binaries into $PREFIX/bin"
  if [[ -x "$ROOT/agent/unixsee-agent" ]]; then
    copy_exec "$ROOT/agent/unixsee-agent" "$PREFIX/bin/unixsee-agent"
  fi
  if [[ -x "$ROOT/mother/unixsee-mother" ]]; then
    copy_exec "$ROOT/mother/unixsee-mother" "$PREFIX/bin/unixsee-mother"
  fi
fi

copy_file "$ROOT/install/examples/agent.local.yml" "$PREFIX/etc/agent.yml"
copy_file "$ROOT/install/examples/mother.local.yml" "$PREFIX/etc/mother.yml"

if [[ "$DO_DASHBOARD" -eq 1 ]]; then
  say "copy dashboard source to $PREFIX/dashboard; no node_modules/.next copied"
  if [[ "$MODE" == "apply" ]]; then
    mkdir -p "$PREFIX/dashboard"
    tar --exclude='node_modules' --exclude='.next' --exclude='out' --exclude='.env' -C "$ROOT/dashboard" -cf - . | tar -C "$PREFIX/dashboard" -xf -
    install -D -m 0644 "$ROOT/install/examples/dashboard.env.example" "$PREFIX/dashboard/.env.example"
  fi
else
  say "skip dashboard install; use --dashboard to include read-only dashboard source"
fi

if [[ "$DO_SYSTEMD" -eq 1 ]]; then
  say "install systemd service templates; services are NOT enabled or started automatically"
  if [[ "$MODE" == "apply" ]]; then
    install -D -m 0644 "$ROOT/install/systemd/unixsee-agent.service" /etc/systemd/system/unixsee-agent.service
    install -D -m 0644 "$ROOT/install/systemd/unixsee-mother.service" /etc/systemd/system/unixsee-mother.service
    if [[ "$DO_DASHBOARD" -eq 1 ]]; then
      install -D -m 0644 "$ROOT/install/systemd/unixsee-dashboard.service" /etc/systemd/system/unixsee-dashboard.service
    fi
    systemctl daemon-reload
  fi
  cat <<SYSTEMD_NOTE
Manual service commands, only after review:
  systemctl start unixsee-mother
  systemctl start unixsee-agent
  systemctl start unixsee-dashboard
SYSTEMD_NOTE
else
  say "skip systemd install; use --systemd to copy templates only"
fi

cat <<DONE
Done.
Next safe steps:
  bash install/validate-package.sh
  bash install/run-smoke-test.sh
DONE
