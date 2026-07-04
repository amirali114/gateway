# R3 Agent Shadow Bridge

## Purpose

R3 adds the first safe Shadow Bridge between the existing PHP Gateway and a future local Go Agent.

The PHP Gateway remains the source of truth. PHP still decides whether a request is allowed, queued, blocked, passed through, or shown the waiting room. The Agent only receives a copy of the already-final PHP decision for observation, comparison, and debugging.

## Shadow mode rule

Shadow mode means:

- PHP decides first.
- The Agent receives the PHP decision after it is known.
- The Agent response is ignored by production flow.
- Agent failure, timeout, invalid JSON, or missing endpoint never changes the user response.

The Agent cannot change:

- allow behavior
- queue behavior
- block behavior
- ticket behavior
- redirect behavior
- WordPress loading behavior
- waiting room rendering

## Default state

Shadow mode is disabled by default:

```php
'agent_shadow_enabled' => false,
```

The default endpoint is local only:

```php
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
```

Do not expose this endpoint publicly. The intended production design is a local Agent bound to `127.0.0.1`.

## Config keys

```php
'agent_shadow_enabled' => false,
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
'agent_shadow_timeout_ms' => 80,
'agent_shadow_log_enabled' => true,
'agent_shadow_log_file' => 'logs/agent-shadow.log',
'agent_shadow_send_headers' => false,
'agent_shadow_send_cookies' => false,
'agent_shadow_secret' => '',
```

## How to enable

Edit `ux_config.php` and enable only on a controlled server:

```php
'agent_shadow_enabled' => true,
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
'agent_shadow_timeout_ms' => 80,
```

Optional HMAC signing:

```php
'agent_shadow_secret' => 'replace-with-a-local-secret',
```

When a secret is set, the bridge sends:

```text
X-Unixsee-Agent-Signature: sha256=<hmac>
```

The HMAC is calculated over the exact JSON body using SHA256.

## How to disable immediately

Set this value back to false:

```php
'agent_shadow_enabled' => false,
```

This silently stops all Agent calls. No code rollback is required.

## What data is sent

The bridge sends one JSON object with schema version `r3.shadow.v1`:

```json
{
  "schema_version": "r3.shadow.v1",
  "timestamp": 1710000000,
  "site": {
    "host": "example.com",
    "scheme": "https"
  },
  "request": {
    "ip": "1.2.3.4",
    "method": "GET",
    "path": "/product/test",
    "query": "a=1",
    "user_agent": "Mozilla/5.0",
    "referer": "",
    "accept": "",
    "is_ajax": false
  },
  "php_decision": {
    "action": "allow|queue|block|pass|wait",
    "reason": "string_reason",
    "status": 200,
    "retry_after": 5
  },
  "runtime": {
    "storage_available": true,
    "storage_fail_mode": "open",
    "gateway_enabled": true,
    "campaign_enabled": true
  }
}
```

## What is intentionally not sent by default

By default, the bridge does not send:

- full cookies
- full request headers
- secrets
- admin passwords
- panel tokens
- ticket signing secrets
- runtime database files
- runtime log contents

Headers are sent only if:

```php
'agent_shadow_send_headers' => true,
```

Even then, sensitive auth/cookie headers are filtered out.

Cookies are sent only if:

```php
'agent_shadow_send_cookies' => true,
```

Leave this disabled unless you are testing locally and know exactly why cookie payloads are needed.

## Logs

When enabled, one-line JSON logs are written to:

```text
logs/agent-shadow.log
```

Each line contains:

```json
{
  "timestamp": 1710000000,
  "endpoint": "http://127.0.0.1:8731/v1/shadow/decision",
  "success": true,
  "http_status": 200,
  "error": null,
  "duration_ms": 12
}
```

Logs never include secrets, full cookies, or sensitive headers.

## Local mock Agent test

A tiny PHP mock server is included for local testing only:

```bash
php -S 127.0.0.1:8731 tools/mock_agent_server.php
```

Then enable shadow mode in `ux_config.php` and browse through the gateway. The mock returns:

```json
{
  "ok": true,
  "mode": "shadow",
  "agent_decision": {
    "action": "allow",
    "reason": "mock_only"
  }
}
```

This response is intentionally ignored by PHP.

## Self-test

Run:

```bash
php tools/uxgw_selftest.php
```

The self-test verifies:

- config keys exist
- shadow mode is disabled in the release config
- bridge file exists
- bridge callable exists
- invalid endpoint does not fatal
- timeout value is sane
- log path parent is writable or can be created

A missing live Agent is not a failure. Warnings are acceptable for optional local dependencies such as `phpredis`.

## Files added or changed

Added:

- `src/AgentShadowBridge.php`
- `tools/mock_agent_server.php`
- `docs/refactor/R3_AGENT_SHADOW_BRIDGE.md`
- `logs/.gitkeep`

Updated:

- `ux_config.php`
- `gateway.php`
- `ux_queue_shell.php`
- `ux_bot_detection.php`
- `tools/uxgw_selftest.php`

## Safety notes

- The bridge is disabled by default.
- The default endpoint is `127.0.0.1`.
- The Agent response is never used for production decisions.
- Agent timeout defaults to 80ms and is clamped defensively.
- If curl is unavailable, the bridge falls back to PHP streams.
- No release ZIP should include runtime `.log`, `.sqlite`, `.wal`, `.shm`, `.bak`, or customer data files.
