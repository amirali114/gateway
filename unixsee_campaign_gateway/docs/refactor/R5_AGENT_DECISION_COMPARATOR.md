# R5 — Agent Decision Comparator

## What R5 adds

R5 adds Agent Decision Comparator mode to the Unixsee Go Agent. R5.1 keeps the same comparator behavior and adds safe diagnostics in a separate document: `docs/refactor/R5_1_COMPARATOR_DIAGNOSTICS.md`.

When PHP sends a shadow payload to:

```text
POST /v1/shadow/decision
```

The Agent now:

1. receives the PHP shadow payload
2. validates JSON and optional HMAC signature
3. computes its own basic Agent shadow decision
4. compares Agent action with the PHP action
5. stores the original payload plus normalized decision/comparison metadata
6. updates comparison counters
7. exposes comparison stats from `/v1/stats`

## Shadow-only rule

R5 is comparison-only.

PHP remains the source of truth. The Agent still cannot affect:

- allow behavior
- queue behavior
- block behavior
- pass behavior
- wait behavior
- ticket behavior
- redirect behavior
- waiting room rendering
- WordPress loading
- storage fail-open / fail-close behavior

The PHP Shadow Bridge sends the request after PHP has already decided. PHP ignores the Agent decision and continues its normal response path.

## Agent config

R5 adds this config section:

```yaml
decision:
  enabled: true
  mode: "comparator"
  default_action: "allow"
  compare_unknown: false
```

Meaning:

- `enabled=true`: Agent computes an independent shadow decision.
- `mode=comparator`: Agent compares only and never enforces.
- `default_action=allow`: safe fallback for managed requests not covered by basic v1 rules.
- `compare_unknown=false`: unknown Agent decisions are counted as `not_compared`, not mismatches.

## Basic v1 decision engine

R5 introduces:

```text
agent/internal/decision/
  engine.go
  engine_test.go
```

The engine contract is:

```go
type Engine interface {
    Decide(ctx context.Context, input Input) Decision
}
```

The basic v1 implementation is intentionally conservative. It is not a final policy engine and does not try to replace PHP.

Rules:

| Condition | Agent action | Reason |
| --- | --- | --- |
| gateway disabled | `pass` | `gateway_disabled` |
| campaign disabled | `pass` | `campaign_disabled` |
| storage unavailable + fail-close | `wait` | `storage_unavailable_fail_close` |
| storage unavailable + fail-open | `pass` | `storage_unavailable_fail_open` |
| method not `GET`, `HEAD`, or `POST` | `allow` | `method_not_managed` |
| static asset path | `pass` | `static_asset` |
| WordPress cron/admin-ajax endpoint | `pass` | `wp_internal_bypass` |
| otherwise | `allow` | `basic_v1_default_allow` |

The response includes low/medium confidence metadata. Confidence is informational only.

## Comparison behavior

PHP and Agent actions are normalized to:

```text
allow
queue
block
wait
pass
unknown
```

Comparison result:

```json
{
  "compared": true,
  "match": true,
  "php_action": "allow",
  "agent_action": "allow",
  "reason": "actions_match"
}
```

Rules:

- If Agent action is `unknown` and `compare_unknown=false`, comparison is skipped with reason `agent_unknown_not_compared`.
- If normalized actions are equal, `match=true`.
- If normalized actions differ, `match=false` and the mismatch counter increments.

A mismatch does not affect users. It only indicates that the basic v1 Agent logic differs from the PHP source-of-truth decision for that request.

## API response

R5 keeps the R4 response compatible and adds non-breaking fields:

```json
{
  "ok": true,
  "mode": "shadow",
  "stored": true,
  "agent_decision": {
    "action": "allow",
    "reason": "basic_v1_default_allow",
    "confidence": "low"
  },
  "comparison": {
    "compared": true,
    "match": true,
    "php_action": "allow",
    "agent_action": "allow",
    "reason": "actions_match"
  }
}
```

PHP behavior does not depend on this response.

## Storage

`storage.ShadowEventRecord` now includes:

```go
AgentDecision decision.Decision   `json:"agent_decision"`
Comparison    decision.Comparison `json:"comparison"`
```

The original raw payload is still stored. JSONL storage remains append-only and compatible with R4.1.

Current storage engines are unchanged:

- `jsonl`: implemented
- `badger`: reserved; fails fast unless a real BadgerDB adapter is added

## Stats

`GET /v1/stats` now includes comparison counters:

```json
{
  "ok": true,
  "mode": "shadow",
  "storage_engine": "jsonl",
  "received": 100,
  "stored": 100,
  "comparison": {
    "enabled": true,
    "compared": 80,
    "matched": 70,
    "mismatched": 10,
    "not_compared": 20,
    "match_rate": 87.5,
    "by_php_action": {
      "allow": 50,
      "queue": 20,
      "block": 5,
      "wait": 5,
      "pass": 20
    },
    "by_agent_action": {
      "allow": 60,
      "queue": 0,
      "block": 0,
      "wait": 5,
      "pass": 35
    }
  }
}
```

`match_rate` is calculated from compared events only:

```text
matched / compared * 100
```

`not_compared` events do not lower match rate.

## Logging

For each received shadow event, R5/R5.1 logs only summary data:

- `site_host`
- `path_class`
- `php_action`
- `agent_action`
- `compared`
- `match`
- `comparison_reason`
- `stored`
- `storage_engine`

For mismatches, R5.1 adds a separate summary log line with `php_reason`, `agent_reason`, and `comparison_reason`.

R5 does not log secrets, full cookies, sensitive headers, or full payloads by default.

## Local test

Build and run:

```bash
cd agent
./scripts/build.sh
./scripts/run-local.sh
```

POST a test payload:

```bash
curl -sS -X POST http://127.0.0.1:8731/v1/shadow/decision \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "schema_version":"r3.shadow.v1",
    "timestamp":1710000000,
    "site":{"host":"example.com","scheme":"https"},
    "request":{"ip":"1.2.3.4","method":"GET","path":"/product/test","query":"a=1","user_agent":"Mozilla/5.0","referer":"","accept":"","is_ajax":false},
    "php_decision":{"action":"allow","reason":"valid_ticket","status":200,"retry_after":5},
    "runtime":{"storage_available":true,"storage_fail_mode":"open","gateway_enabled":true,"campaign_enabled":true}
  }'
```

Inspect stats and diagnostics:

```bash
curl http://127.0.0.1:8731/v1/stats
curl http://127.0.0.1:8731/v1/comparison/diagnostics
```

## Enable PHP shadow config

In the PHP Gateway config:

```php
'agent_shadow_enabled' => true,
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
'agent_shadow_timeout_ms' => 80,
'agent_shadow_log_enabled' => true,
'agent_shadow_secret' => '',
```

Disable immediately:

```php
'agent_shadow_enabled' => false,
```

## What is intentionally not implemented yet

R5 intentionally does not implement:

- Agent enforcement
- real queue capacity decisions
- aggressive bot blocking
- ticket validation parity
- redirect decisions
- waiting room rendering changes
- WordPress loading changes
- persistent comparison rollups across restarts
- production BadgerDB adapter

## Why this is needed before real policy work

R5 gives a safe measurement layer before any future enforcement work. It lets us answer:

- where does the Agent agree with PHP?
- where does the Agent disagree?
- which PHP actions are most likely to mismatch?
- which Agent default rules are too broad or too narrow?

That data is needed before R6/R7 policy or queue-engine work.

## Next phase plan

The next phase can use comparison data to design a stronger Agent policy model, but enforcement must remain off until there is enough evidence that Agent decisions are safe and compatible with PHP production behavior.
