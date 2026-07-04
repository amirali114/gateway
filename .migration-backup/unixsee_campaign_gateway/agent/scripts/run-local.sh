#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ ! -x ./bin/unixsee-agent ]]; then
  ./scripts/build.sh
fi
exec ./bin/unixsee-agent --config ./configs/agent.example.yml
