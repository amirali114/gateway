# R6 — Policy Profile Skeleton

## What R6 adds

R6 adds the first structured policy profile model to the local Go Agent. The Agent still receives PHP shadow payloads, computes an Agent-side shadow decision, compares it with PHP, stores the event, and exposes stats/diagnostics. The difference is that the Agent decision is now driven by a local policy profile instead of only hardcoded Basic V1 logic.

R6 adds:

- `agent/internal/policy/`
- strongly typed policy structs
- local policy defaults
- policy validation
- policy-driven decision logic
- `GET /v1/policy/effective`
- policy summary in `/v1/stats`
- policy health in `/readyz`

## Absolute shadow-only rule

PHP remains the source of truth. R6 does not enforce Agent decisions. The Agent cannot change:

- allow, queue, block, pass, or wait behavior
- ticket behavior
- redirects
- waiting-room rendering
- WordPress loading
- PHP storage fail-open/fail-close behavior

The Agent still only observes, computes, compares, stores, and reports.

## Policy source

R6 supports local policy only:

```yaml
policy:
  source: "local"
```

The future source is reserved:

```yaml
policy:
  source: "mother"
```

If `source=mother` is configured in R6, the Agent fails fast with:

```text
policy source mother is not implemented in R6
```

This avoids pretending that Mother/Core policy sync exists before it actually does.

## Safe default policy

If the config has no `policy:` block, the Agent loads a safe local default:

- gateway enabled
- campaign enabled
- campaign mode `shadow`
- storage fail mode `open`
- static assets pass
- WordPress internals pass
- admin pass
- checkout pass
- cart/account/api/product/other allow
- bot disabled
- queue disabled
- managed methods: `GET`, `HEAD`, `POST`

## Policy-driven decision logic

R6 uses policy in the shadow decision engine:

| Condition | Agent action | Reason |
| --- | --- | --- |
| policy gateway disabled | `pass` | `policy_gateway_disabled` |
| runtime gateway disabled | `pass` | `runtime_gateway_disabled` |
| policy campaign disabled | `pass` | `policy_campaign_disabled` |
| runtime campaign disabled | `pass` | `runtime_campaign_disabled` |
| storage unavailable + fail-open | `pass` | `storage_unavailable_fail_open` |
| storage unavailable + fail-close | `wait` | `storage_unavailable_fail_close` |
| unmanaged method | `allow` | `method_not_managed` |
| static asset | policy route action | `policy_static_asset_bypass` |
| WordPress internal route | policy route action | `policy_wp_internal_bypass` |
| admin route | policy route action | `policy_admin_bypass` |
| checkout route | policy route action | `policy_checkout_bypass` |
| cart route | policy route action | `policy_cart_route` |
| account route | policy route action | `policy_account_route` |
| API route | policy route action | `policy_api_route` |
| product route | policy route action | `policy_product_route` |
| other route | policy route action | `policy_other_route` |

The path classifier remains query-aware from R5.2. Query keys can classify WooCommerce routes, but query values are not exposed in diagnostics.

## Effective policy endpoint

Local endpoint:

```bash
curl http://127.0.0.1:8731/v1/policy/effective
```

Example response:

```json
{
  "ok": true,
  "mode": "shadow",
  "policy": {
    "source": "local",
    "profile_id": "default-local-shadow",
    "version": 1
  },
  "summary": {
    "gateway_enabled": true,
    "campaign_enabled": true,
    "storage_fail_mode": "open",
    "queue_enabled": false,
    "bot_enabled": false
  }
}
```

No secrets or sensitive request data are exposed.

## Stats and readiness

`GET /readyz` remains compatible and adds:

```json
{
  "policy": "ok"
}
```

`GET /v1/stats` remains compatible and adds:

```json
{
  "policy": {
    "source": "local",
    "profile_id": "default-local-shadow",
    "version": 1
  }
}
```

## What is intentionally not implemented yet

R6 does not implement:

- Mother/Core policy sync
- remote commands
- real queue capacity decisions
- bot blocking
- enforcement mode
- PHP behavior changes
- BadgerDB adapter

Queue and bot profile sections exist as typed config only. They are disabled by default and do not enforce anything.

## Validation

Run:

```bash
php tools/uxgw_selftest.php
php tools/uxgw_release_scan.php
cd agent
go test ./...
go build ./cmd/unixsee-agent
```

Local runtime checks:

```bash
curl http://127.0.0.1:8731/healthz
curl http://127.0.0.1:8731/readyz
curl http://127.0.0.1:8731/v1/policy/effective
curl http://127.0.0.1:8731/v1/stats
curl http://127.0.0.1:8731/v1/comparison/diagnostics
```

## Next phase plan

R6 prepares the Agent for either:

- Mother/Core policy API sync, or
- real local queue policy tuning while still in shadow mode.

Any future enforcement must be introduced as a separate, explicit, heavily guarded phase. R6 is not enforcement.
