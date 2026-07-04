# R6.1 Policy Bypass Semantics Fix

R6.1 fixes one specific policy-modeling issue in the Go Agent decision engine: `policy.bypass.*` flags now actually control whether a route class is treated as a bypass.

PHP remains the source of truth. The Agent remains shadow-only. No Agent decision is enforced and no PHP Gateway, queue, ticket, redirect, waiting-room, or WordPress loading behavior is changed.

## Why this fix was needed

R6 introduced local policy profiles, but route actions were always applied with bypass-style reasons for several route classes. For example:

```yaml
bypass:
  checkout: false

routes:
  checkout_action: "pass"
```

In R6, the Agent could still return:

```json
{
  "action": "pass",
  "reason": "policy_checkout_bypass"
}
```

That made `bypass.checkout=false` semantically ineffective and made diagnostics misleading.

## Fixed semantics

R6.1 distinguishes three decision types:

1. **Bypass decisions** — only when the matching `policy.bypass.*` flag is `true`.
2. **Route policy decisions** — route class is recognized, but not treated as a bypass.
3. **Default decisions** — sensitive bypass-capable route classes are not bypassed, so the campaign default action is used.

## Route behavior

### Static assets

```yaml
bypass:
  static_assets: true
routes:
  static_asset_action: "pass"
```

Returns configured route action with:

```text
policy_static_asset_bypass
```

If `static_assets=false`, the Agent uses `policy.campaign.default_action` with:

```text
policy_static_asset_not_bypassed
```

### WordPress internals

If `bypass.wp_internal=true`, the Agent uses `routes.wp_internal_action` with:

```text
policy_wp_internal_bypass
```

If false, it uses `policy.campaign.default_action` with:

```text
policy_wp_internal_not_bypassed
```

### Admin

If `bypass.admin=true`, the Agent uses `routes.admin_action` with:

```text
policy_admin_bypass
```

If false, it uses `policy.campaign.default_action` with:

```text
policy_admin_not_bypassed
```

### Checkout

If `bypass.checkout=true`, the Agent uses `routes.checkout_action` with:

```text
policy_checkout_bypass
```

If false, it uses `policy.campaign.default_action` with:

```text
policy_checkout_not_bypassed
```

This also applies to query-aware WooCommerce routes such as:

```text
/?wc-api=WC_Gateway_Test
```

Only query keys are used for classification; query values are not exposed in diagnostics.

### Cart, account, and API

For these route classes, the bypass flag controls the reason and confidence, but route actions still apply.

When `bypass.cart=true`:

```text
policy_cart_bypass
```

When `bypass.cart=false`:

```text
policy_cart_route
```

The same pattern applies to account and API:

```text
policy_account_bypass / policy_account_route
policy_api_bypass / policy_api_route
```

### Product and other

No bypass flags exist for product or other routes in R6.1. They continue to use route policy actions:

```text
policy_product_route
policy_other_route
```

## Confidence

Confidence remains intentionally simple:

- bypass-enabled decision: `medium`
- route policy decision: `low`
- campaign default fallback: `low`

## What did not change

R6.1 does not add enforcement, Mother sync, remote commands, bot blocking, real queue capacity logic, or production control paths. It only corrects local shadow decision semantics and makes comparator diagnostics more honest.

## Verification

Run:

```bash
php tools/uxgw_selftest.php
php tools/uxgw_release_scan.php
cd agent && go test ./...
cd agent && go build ./cmd/unixsee-agent
```

Runtime endpoints remain compatible:

```text
GET  /healthz
GET  /readyz
GET  /v1/policy/effective
POST /v1/shadow/decision
GET  /v1/stats
GET  /v1/comparison/diagnostics
```

## Next phase

After this semantic fix, the package is ready for either R7 Mother/Core policy sync skeleton or deeper real queue policy tuning. Those future phases must still preserve the rule that PHP remains the production source of truth until explicit enforcement is designed and accepted.
