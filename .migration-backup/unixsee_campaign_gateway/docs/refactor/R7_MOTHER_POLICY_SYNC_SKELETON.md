# R7 Mother/Core Policy Sync Skeleton

R7 adds the first local/dev Mother/Core service and lets the Go Agent pull a policy profile from it. This is a policy-sync skeleton only.

## Safety boundary

PHP remains the source of truth. The Go Agent remains shadow-only. Mother policy is used only to tune the Agent's shadow decision and comparison output. It does not change allow, queue, block, pass, wait, ticket, redirect, waiting-room rendering, or WordPress loading behavior.

Mother is not in the user request hot path. The Agent fetches policy at startup, schedules a background policy refresh based on `mother.policy_refresh_seconds`, and uses local fallback if Mother is unavailable.

## What Mother provides

The new `mother/` service exposes:

- `GET /healthz`
- `GET /readyz`
- `GET /v1/agents/{agent_id}/policy`
- `GET /v1/debug/policies/default` for local/dev debug inspection. R8C.1 uses `/v1/policies/default` as the normal policy resource read endpoint.

The default policy is `mother-default-shadow`, version `1`, source `mother`, and mode `shadow`.

## Run Mother locally

```bash
cd mother
./scripts/build.sh
./scripts/run-local.sh
```

Check it:

```bash
curl http://127.0.0.1:8732/healthz
curl http://127.0.0.1:8732/readyz
curl http://127.0.0.1:8732/v1/agents/local-dev-agent/policy
```

Mother binds to `127.0.0.1:8732` by default and refuses public bind unless `security.allow_remote_bind=true`.

## Agent configuration for Mother policy

In `agent/configs/agent.example.yml`:

```yaml
mother:
  enabled: true
  base_url: "http://127.0.0.1:8732"
  agent_id: "local-dev-agent"
  shared_secret: ""
  require_signature: false
  policy_pull_timeout_ms: 500
  policy_refresh_seconds: 30
  use_last_known_good: true
  policy_cache_path: "./data/policy-cache/last-known-policy.json"

policy:
  source: "mother"
```

When `policy.source=local`, the Agent behaves like R6.1. When `policy.source=mother` and `mother.enabled=true`, the Agent fetches policy from Mother, validates it, caches it as last known good, refreshes it in the background, and uses it for shadow decisions.

## Fallback behavior

If Mother is unavailable, the Agent still starts.

Policy status values:

- `local`: local policy is active
- `fresh`: policy was fetched from Mother successfully
- `last_known_good`: Mother failed, cached Mother policy is active
- `fallback_default`: Mother failed and safe local default is active
- `invalid_fallback`: Mother returned invalid policy and safe fallback is active

View status with:

```bash
curl http://127.0.0.1:8731/v1/policy/effective
curl http://127.0.0.1:8731/readyz
curl http://127.0.0.1:8731/v1/stats
```

## HMAC signing

If `mother.shared_secret` is set, the Agent signs the policy request:

```text
X-Unixsee-Agent-ID: <agent_id>
X-Unixsee-Agent-Timestamp: <unix_timestamp>
X-Unixsee-Agent-Signature: sha256=<hmac>
```

Canonical string:

```text
GET
/v1/agents/<agent_id>/policy
<timestamp>
```

Mother validates signatures only when `security.require_signature=true`.

## Storage

R7 Mother uses memory/dev storage only. PostgreSQL is intentionally not implemented. If configured, startup fails clearly:

```text
mother storage engine postgres is not implemented in R7
```

The Agent policy cache is a simple JSON file at `./data/policy-cache/last-known-policy.json` by default and stores no secrets.

## Not implemented yet

- Production Mother database
- Dashboard/API for editing policies
- Remote commands
- Live enforcement
- Real queue-capacity decision engine
- Mother request in PHP/user hot path

## Next phase

The package is ready for persistent Mother DB, a dashboard skeleton, or real queue-policy tuning while keeping PHP as the production authority.
