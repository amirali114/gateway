# R5.2 — Query-Aware Path Diagnostics

## What R5.2 fixes

R5.1 added comparison diagnostics, but path classification only used `request.path`. Query-based WordPress and WooCommerce routes could therefore be classified as `other` when PHP sent a payload like:

```json
{
  "request": {
    "path": "/",
    "query": "wc-api=WC_Gateway_Test"
  }
}
```

R5.2 makes diagnostics query-aware by introducing:

```go
ClassifyRequestPath(path, query)
```

The existing `ClassifyPath(path)` function remains as a backward-compatible wrapper and calls `ClassifyRequestPath(path, "")`.

## Shadow-only rule

R5.2 is diagnostics-only. It does not enforce Agent decisions. PHP remains the source of truth. The Agent still cannot change:

- allow, queue, block, pass, or wait behavior
- ticket behavior
- redirects
- waiting-room rendering
- WordPress loading
- PHP storage fail-open or fail-close behavior

## Classification behavior

The classifier uses a sanitized lowercase path and safe parsed query keys. It does not use or expose query values.

Key examples:

| Input | Class |
| --- | --- |
| `ClassifyRequestPath("/", "wc-api=WC_Gateway_Test")` | `checkout` |
| `ClassifyRequestPath("/", "add-to-cart=123")` | `cart` |
| `ClassifyRequestPath("/", "product=123")` | `product` |
| `ClassifyRequestPath("/", "p=123")` | `product` |
| `ClassifyRequestPath("/", "rest_route=/wc/v3/orders")` | `api` |
| `ClassifyRequestPath("/product/test", "secret=1")` | `product` |
| `ClassifyRequestPath("/checkout/", "token=secret")` | `checkout` |

The low-cardinality classes remain:

- `static_asset`
- `wp_internal`
- `admin`
- `checkout`
- `product`
- `cart`
- `account`
- `api`
- `other`

## Security behavior

R5.2 intentionally avoids sensitive query exposure:

- full query strings are not returned by diagnostics
- query values are not returned
- recent mismatch `path` remains path-only
- query values are not logged
- cookies and sensitive headers are not exposed
- IP and User-Agent remain hidden by default unless explicitly enabled in local trusted testing

Only query keys are used for classification. For example, `wc-api=WC_Gateway_Test` can classify the request as `checkout`, but `WC_Gateway_Test` is not exposed in `/v1/comparison/diagnostics`.

## Updated integration

The shadow receiver now passes both path and query into diagnostics:

```go
pathClass := stats.ClassifyRequestPath(payload.Request.Path, payload.Request.Query)
```

`stats.ComparisonDetails` includes `Query` for classification only. `RecentMismatch.Path` continues to store the sanitized path without query.

## Diagnostics endpoint compatibility

`GET /v1/comparison/diagnostics` keeps the R5.1 response shape. No sensitive fields were added.

The important field improved by R5.2 is:

```json
{
  "mismatch_by_path_class": {
    "checkout": 1
  }
}
```

## Local verification

Run the Agent locally, then POST a shadow payload where the path is `/` and query is `wc-api=WC_Gateway_Test`. After that, inspect diagnostics:

```bash
curl http://127.0.0.1:8731/v1/comparison/diagnostics
```

Expected behavior:

- `mismatch_by_path_class.checkout` increments when the comparison mismatches
- recent mismatch `path` remains `/`
- query value does not appear in the diagnostics response

## Why this prepares R6

R6 will need cleaner policy profile skeletons. Query-aware diagnostics gives safer visibility into real WooCommerce traffic classes before any policy or queue logic is added. It improves tuning data without changing production behavior.
