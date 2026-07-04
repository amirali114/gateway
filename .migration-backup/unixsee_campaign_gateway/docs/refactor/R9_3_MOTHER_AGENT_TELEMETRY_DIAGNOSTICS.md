# R9.3 Mother Agent Telemetry Diagnostics

## Summary

R9.3 adds Agent-to-Mother telemetry so the Persian RTL control plane becomes operationally useful without exposing the Agent publicly and without direct Dashboard-to-Agent calls.

PHP Gateway remains the runtime source of truth. The Go Agent remains shadow-only. Mother stores telemetry, diagnostics summaries, and recent events in memory for now.

## Endpoints added

Mother:

```http
POST /v1/agents/{agent_id}/telemetry
GET  /v1/agents/{agent_id}/telemetry
GET  /v1/agents/{agent_id}/diagnostics
GET  /v1/agents/{agent_id}/events
GET  /v1/diagnostics/summary
```

Existing R9.1/R9.2 endpoints remain compatible.

## Telemetry model

Agent pushes telemetry to Mother on a configurable interval. Defaults:

```yaml
telemetry:
  enabled: true
  push_interval_seconds: 30
  push_timeout_ms: 700
```

Telemetry includes:

- Agent identity
- mode: `shadow`
- uptime seconds
- current policy summary
- storage engine/status
- shadow counters
- comparison counters and match rate
- runtime module summary

No secrets, cookies, request payloads, or sensitive headers are sent.

## Security model

Telemetry uses the same Mother/Agent identity and HMAC pattern as policy pull:

```text
X-Unixsee-Agent-ID
X-Unixsee-Agent-Timestamp
X-Unixsee-Agent-Signature
```

If Mother requires signatures, unsigned or invalid telemetry is rejected. Agent remains local-only on the client site and is never exposed publicly.

## Mother storage

R9.3 stores the latest telemetry per Agent and a bounded event ring buffer in memory:

- max 100 events per Agent
- events for policy pull, telemetry received, draft saved, config published, validation/signature failures where applicable

PostgreSQL is still intentionally not added.

## Dashboard pages changed

- `/` now shows telemetry freshness, received shadow payloads, mismatch totals, and latest events.
- `/agents` shows telemetry status, match rate, received count, mismatch count, and last telemetry time.
- `/agents/[agent_id]` shows latest telemetry, counters, by-action breakdown, runtime module state, storage state, and recent events.
- `/diagnostics` uses Mother diagnostics summary and registry state.
- `/mother` shows Mother diagnostics summary and keeps debug endpoint status clear.

Dashboard production pages use Mother APIs only.

## Limitations

- Telemetry is memory-only and resets when Mother restarts.
- No PostgreSQL persistence yet.
- No enforcement mode.
- No remote commands.
- No direct dashboard-to-Agent production fetches.
- Dashboard still must not be exposed publicly without authentication and reverse proxy protection.

## Automated validation summary

Run before release:

```bash
php -l $(find . -name '*.php')
php tools/uxgw_selftest.php
php tools/uxgw_release_scan.php

cd agent && gofmt -w $(find . -name '*.go') && go test ./... && go build ./cmd/unixsee-agent
cd ../mother && gofmt -w $(find . -name '*.go') && go test ./... && go build ./cmd/unixsee-mother
cd ../dashboard && npm ci && npm audit && npm run build
```
