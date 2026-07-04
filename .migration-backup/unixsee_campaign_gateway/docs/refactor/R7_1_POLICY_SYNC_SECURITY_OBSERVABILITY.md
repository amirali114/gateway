# R7.1 — Policy Sync Security and Observability

R7.1 hardens the Mother/Core policy sync skeleton and adds safe Agent-side sync visibility. PHP remains the production source of truth and the Go Agent remains shadow-only.

## What changed

- Mother validates `X-Unixsee-Agent-ID` against `/v1/agents/{agent_id}/policy`.
- When `security.require_signature=true`, the Agent ID header is mandatory and must match the path.
- Mother HMAC validation uses the canonical string:

```text
GET
/v1/agents/<agent_id>/policy
<unix_timestamp>
```

- Mother rejects missing, old, future, malformed, or mismatched signatures when signatures are required.
- Timestamp skew defaults to 300 seconds and can be configured with `security.signature_max_skew_seconds` between 30 and 3600.
- Mother debug endpoint `/v1/debug/policies/default` is disabled by default through `debug.enabled=false`. R8C.1 reserves `/v1/policies/default` for normal policy resource reads.
- Agent exposes `GET /v1/policy/sync-status` for local diagnostics.
- Release scanner now fails on policy cache runtime files such as `agent/data/policy-cache/`, `last-known-policy.json`, and temporary policy cache files.

## Agent identity behavior

For `GET /v1/agents/{agent_id}/policy`:

- If `X-Unixsee-Agent-ID` is present, it must match `{agent_id}`.
- If signatures are required, `X-Unixsee-Agent-ID` must be present.
- Mismatches return a safe 400/401 response and only sanitized agent IDs are logged.
- Secrets are never logged.

## Debug endpoint safety

`GET /v1/debug/policies/default` is local-dev only and disabled by default.

```yaml
debug:
  enabled: false
```

Enable only for trusted local testing:

```yaml
debug:
  enabled: true
```

If `security.require_signature=true`, the debug endpoint also requires a valid signature. In production-like config, keep it disabled.

## Agent policy sync status

Use:

```bash
curl http://127.0.0.1:8731/v1/policy/sync-status
```

Response includes:

- current policy source/profile/version/status
- whether Mother sync is enabled
- sanitized Mother base URL
- agent ID
- last attempt time
- last success time
- sanitized last error
- next refresh interval
- last-known-good/cache flags

`shared_secret` is never exposed. If the Mother URL contains credentials, they are stripped before reporting.

## last_known_good vs fallback_default

- `fresh`: policy was fetched and validated from Mother.
- `last_known_good`: Mother failed, but a previously validated cached policy was loaded.
- `fallback_default`: Mother was unavailable or disabled and no valid cache existed.
- `invalid_fallback`: Mother returned invalid policy and Agent fell back safely.
- `local`: local embedded policy is used.

## Still shadow-only

R7.1 does not enforce Agent or Mother decisions. It does not change PHP Gateway, queue, tickets, waiting room, redirects, or WordPress loading behavior.

## Not implemented yet

- PostgreSQL Mother storage
- Mother dashboard
- remote commands
- live policy enforcement
- real queue capacity policy

## Next phase candidates

- Persistent Mother DB
- Mother dashboard skeleton
- richer policy versioning
- real queue policy tuning in shadow mode
