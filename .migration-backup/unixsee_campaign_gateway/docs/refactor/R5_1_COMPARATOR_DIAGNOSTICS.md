# R5.1 — Comparator Diagnostics

## What R5.1 adds

R5.1 improves observability for the R5 Agent Decision Comparator.

The Go Agent still receives PHP shadow payloads, computes a basic Agent shadow decision, compares it with the PHP source-of-truth decision, stores the event, and returns a shadow response. R5.1 adds safe diagnostic summaries so mismatches can be analyzed before any real policy or queue-engine work begins.

## Shadow-only rule

R5.1 does not enforce Agent decisions.

PHP remains the source of truth. The Agent still cannot affect:

- allow / queue / block / pass / wait behavior
- ticket behavior
- redirects
- waiting room rendering
- WordPress loading
- PHP storage fail-open / fail-close behavior

A mismatch is diagnostic only. It does not change the user response.

## New config

Agent config now includes:

```yaml
diagnostics:
  enabled: true
  recent_mismatch_limit: 100
  expose_recent_mismatches: true
  include_user_agent: false
  include_ip: false
```

Defaults are intentionally safe:

- diagnostics are enabled
- recent mismatch samples are capped at 100
- IP is hidden by default
- User-Agent is hidden by default
- full payloads, cookies, headers, and query strings are not exposed in diagnostics

## New endpoint

```http
GET /v1/comparison/diagnostics
```

Example response:

```json
{
  "ok": true,
  "mode": "shadow",
  "diagnostics_enabled": true,
  "comparison": {
    "enabled": true,
    "compared": 100,
    "matched": 80,
    "mismatched": 20,
    "not_compared": 0,
    "match_rate": 80
  },
  "matrix": {
    "allow": {
      "allow": 70,
      "queue": 0,
      "block": 0,
      "wait": 0,
      "pass": 2,
      "unknown": 0
    },
    "queue": {
      "allow": 15,
      "queue": 10,
      "block": 0,
      "wait": 0,
      "pass": 0,
      "unknown": 0
    }
  },
  "mismatch_by_reason": {
    "actions_mismatch": 20
  },
  "mismatch_by_agent_reason": {
    "basic_v1_default_allow": 15,
    "static_asset": 5
  },
  "mismatch_by_path_class": {
    "product": 12,
    "checkout": 3,
    "other": 5
  },
  "recent_mismatches": []
}
```

The endpoint is local-only by default because the Agent still binds to `127.0.0.1:8731` unless `security.allow_remote_bind=true` is explicitly set.

## Diagnostic structures

R5.1 tracks in memory:

- `matrix`: PHP action → Agent action → count
- `mismatch_by_reason`: comparison reason → count
- `mismatch_by_agent_reason`: Agent decision reason → count
- `mismatch_by_path_class`: low-cardinality request class → count
- `recent_mismatches`: bounded in-memory ring buffer

This is intentionally not a full analytics database. It is a safe tuning view for shadow comparison.

## Path classification

`ClassifyPath(path)` maps paths to low-cardinality classes:

- `static_asset`
- `wp_internal`
- `admin`
- `checkout`
- `product`
- `cart`
- `account`
- `api`
- `other`

The classifier is deliberately simple. It is only used for mismatch triage, not for enforcement.

## Recent mismatches

Recent mismatch samples use this shape:

```json
{
  "time": "2026-01-01T00:00:00Z",
  "site_host": "example.com",
  "path": "/product/test",
  "path_class": "product",
  "php_action": "queue",
  "php_reason": "campaign_capacity_full",
  "agent_action": "allow",
  "agent_reason": "basic_v1_default_allow",
  "comparison_reason": "actions_mismatch",
  "ip": null,
  "user_agent": null
}
```

Important safety details:

- query strings are stripped from `path`
- IP is `null` unless `diagnostics.include_ip=true`
- User-Agent is `null` unless `diagnostics.include_user_agent=true`
- full payloads are not returned
- cookies and sensitive headers are never returned

For trusted local testing only, IP and User-Agent can be enabled:

```yaml
diagnostics:
  include_ip: true
  include_user_agent: true
```

Do not enable those fields on exposed or shared deployments.

## Stats compatibility

`GET /v1/stats` remains compatible with R5. It keeps the existing counters and may include a small diagnostics summary, but fields are not removed or renamed.

Use `/v1/comparison/diagnostics` for detailed mismatch analysis.

## Logging

Mismatch logs contain summary fields only:

- `site_host`
- `path_class`
- `php_action`
- `agent_action`
- `php_reason`
- `agent_reason`
- `comparison_reason`
- `stored`

The Agent does not log full payloads, secrets, cookies, or sensitive headers by default.

## Storage behavior

JSONL storage behavior is unchanged. Stored `ShadowEventRecord` still includes the original payload and R5 decision/comparison metadata. R5.1 diagnostics are in-memory summaries for fast local analysis.

BadgerDB is still not required in this package.

## Local test

Build and run:

```bash
cd agent
./scripts/build.sh
./scripts/run-local.sh
```

Post one matching request and one intentional mismatch:

```bash
curl -sS -X POST http://127.0.0.1:8731/v1/shadow/decision \
  -H 'Content-Type: application/json' \
  --data-binary '{"schema_version":"r3.shadow.v1","timestamp":1710000000,"site":{"host":"example.com","scheme":"https"},"request":{"ip":"1.2.3.4","method":"GET","path":"/product/test","query":"a=1","user_agent":"Mozilla/5.0","referer":"","accept":"","is_ajax":false},"php_decision":{"action":"queue","reason":"campaign_capacity_full","status":200,"retry_after":5},"runtime":{"storage_available":true,"storage_fail_mode":"open","gateway_enabled":true,"campaign_enabled":true}}'
```

Inspect diagnostics:

```bash
curl http://127.0.0.1:8731/v1/comparison/diagnostics
```

## Why this is needed before real policy tuning

R5 proved the Agent can compute and compare decisions. R5.1 makes the disagreement visible without exposing sensitive data. This lets future policy work focus on high-impact mismatch classes, such as checkout, product, or queue-related paths, before any enforcement is considered.

## Next phase plan

The next phase can use R5.1 diagnostics to tune the basic policy model and design real queue/capacity logic. Enforcement must remain disabled until comparison data shows the Agent is safe enough to be considered for controlled experiments.
