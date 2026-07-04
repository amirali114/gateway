#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p bin
CGO_ENABLED="${CGO_ENABLED:-0}" go build -trimpath -ldflags="-s -w" -o bin/unixsee-agent ./cmd/unixsee-agent
printf 'Built: %s\n' "$(pwd)/bin/unixsee-agent"
