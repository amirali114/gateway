# Unixsee Local Go Agent

The Unixsee Agent is a local shadow/comparator service for Unixsee Campaign Gateway. PHP remains the production source of truth. The Agent receives shadow payloads, computes a non-enforcing decision, compares it with PHP, stores diagnostics, and exposes local stats.

## Run locally

```bash
cd agent
./scripts/build.sh
./scripts/run-local.sh
```

Default bind:

```text
127.0.0.1:8731
```

## Core endpoints

```http
GET /healthz
GET /readyz
GET /v1/policy/effective
POST /v1/shadow/decision
GET /v1/stats
GET /v1/comparison/diagnostics
```

## Policy sources

R6 introduced local policy profiles. R7 adds optional Mother/Core policy pull.

Local mode:

```yaml
policy:
  source: "local"
```

Mother mode:

```yaml
mother:
  enabled: true
  base_url: "http://127.0.0.1:8732"
  agent_id: "local-dev-agent"
  shared_secret: ""
  policy_pull_timeout_ms: 500
  policy_refresh_seconds: 30
  use_last_known_good: true
  policy_cache_path: "./data/policy-cache/last-known-policy.json"

policy:
  source: "mother"
```

The Agent fetches Mother policy at startup, validates it, caches last known good, refreshes it in the background using `mother.policy_refresh_seconds`, and uses it only for shadow decisions. No Mother request is made from the PHP/user request hot path.

## Policy status

`GET /v1/policy/effective`, `/readyz`, and `/v1/stats` expose policy status:

- `local`
- `fresh`
- `last_known_good`
- `fallback_default`
- `invalid_fallback`

## Diagnostics

Comparison diagnostics are safe by default. They expose low-cardinality summaries, comparison matrix, path-class mismatch counts, and bounded recent mismatch samples. IP/User-Agent are hidden unless explicitly enabled.

## Storage

The Agent uses the honest `jsonl` event store by default. `badger` remains fail-fast until a real BadgerDB adapter is introduced.

## Safety

The Agent is shadow-only. It must not enforce allow, queue, block, pass, wait, ticket, redirect, waiting-room rendering, or WordPress loading behavior.

## R7.1 policy sync status

R7.1 adds local sync diagnostics:

```http
GET /v1/policy/sync-status
```

The response reports current policy identity/status and Mother sync state. It never exposes `mother.shared_secret`. If `mother.base_url` contains credentials, the Agent strips them before returning diagnostics.

Example:

```bash
curl http://127.0.0.1:8731/v1/policy/sync-status
```

Important fields:

- `sync.last_attempt_at`
- `sync.last_success_at`
- `sync.last_error`
- `sync.use_last_known_good`
- `sync.cache_enabled`

Policy cache runtime files are local state only and must not be shipped in release ZIPs.

## R7.3 config list compatibility

The Agent config parser is intentionally simple. It is not a full YAML implementation, but it now supports both block-list and inline-list syntax for the known list field `policy.methods.managed`.

Supported:

```yaml
policy:
  methods:
    managed:
      - "GET"
      - "HEAD"
      - "POST"
```

```yaml
policy:
  methods:
    managed: ["GET", "HEAD", "POST"]
```

```yaml
policy:
  methods:
    managed: ['GET', 'HEAD', 'POST']
```

```yaml
policy:
  methods:
    managed: [GET, HEAD, POST]
```

Malformed inline lists fail with a clear parse error. Unknown list fields are still rejected. This is a compatibility cleanup only; the Agent remains shadow-only and PHP remains the production source of truth.

## R8B Dashboard integration

R8B adds a local/dev read-only dashboard under `../dashboard`.

The dashboard reads the Agent APIs only:

```http
GET /healthz
GET /readyz
GET /v1/stats
GET /v1/policy/effective
GET /v1/policy/sync-status
GET /v1/comparison/diagnostics
```

No Agent API behavior changes are required for R8B. The Agent remains shadow-only and non-enforcing.

## R8C assigned Mother policies

The Agent API and hot path are unchanged. When `policy.source=mother`, the Agent still pulls from:

```http
GET /v1/agents/{agent_id}/policy
```

In R8C, Mother may return an assigned policy instead of the default policy. The Agent continues to treat that policy as shadow-only input. PHP remains the source of truth and no user-facing behavior changes.

## R8D staging install notes

R8D adds local/dev install examples under `../install/examples/agent.local.yml` and systemd templates under `../install/systemd/`.

The example keeps the Agent bound to `127.0.0.1:8731`, shadow-only, and configured to pull policy from local Mother for staging smoke tests. It writes runtime data only to the configured local prefix or temporary smoke-test directory.

The installer does not enable enforcement and does not place the Agent in the PHP user request hot path.

## R9.3 telemetry push

The Agent can push safe telemetry to Mother while remaining shadow-only:

```yaml
telemetry:
  enabled: true
  push_interval_seconds: 30
  push_timeout_ms: 700
```

Telemetry includes storage status, shadow counters, comparison match rate, policy summary, and runtime module flags. It does not include secrets, cookies, full request payloads, or sensitive headers.

Telemetry is sent to:

```http
POST /v1/agents/{agent_id}/telemetry
```

The request uses the same Agent identity and HMAC signing pattern as Mother policy pull when `mother.shared_secret` is configured. No inbound commands are added to the Agent.

## R9.7 control-plane acknowledgement metadata

The Agent remains shadow-only. When Mother includes `control_plane` metadata in the policy pull response, the Agent reports that metadata in telemetry so Mother can mark the config version as acknowledged. This is metadata-only and does not enable enforcement.
