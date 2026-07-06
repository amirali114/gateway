#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
go run ./cmd/unixsee-mother --config ./configs/mother.example.yml
