# R4 — Go Agent Shadow Receiver

## What R4 adds

R4 adds a dedicated local Go Agent under:

```text
agent/
```

The Agent runs as a local HTTP service and receives shadow decision payloads from the existing R3 PHP Shadow Bridge.

Default local bind:

```text
127.0.0.1:8731
```

Supported endpoints:

```text
GET  /healthz
GET  /readyz
GET  /v1/stats
POST /v1/shadow/decision
```

## R4.1 storage correction

R4.1 updates this R4 design note: the initial R4 package used a durable JSONL event store but named it like BadgerDB. R4.1 fixes that.

Current R4.1 storage engines:

```yaml
storage:
  engine: "jsonl"
  path: "./data/agent-events"
  sync_writes: false
```

- `jsonl` is implemented and writes append-only JSON Lines to `<path>/shadow-events.jsonl`.
- `badger` is reserved for a future real `github.com/dgraph-io/badger/v4` adapter.
- If `engine=badger` is selected without the real adapter, startup fails clearly instead of silently falling back.

This keeps the storage layer honest and avoids pretending JSONL is BadgerDB.


## R5 comparator note

R5 keeps all R4/R4.1 safety guarantees but changes the Agent response from passive `observe` to a real shadow decision plus non-breaking comparison metadata. For current comparator behavior, see:

```text
docs/refactor/R5_AGENT_DECISION_COMPARATOR.md
```

## Shadow-only rule

The Agent is **observe-only** in R4/R4.1.

PHP remains the source of truth. PHP still decides:

- allow
- queue
- block
- pass
- wait
- ticket handling
- redirects
- waiting room output
- WordPress loading
- storage fail-open / fail-close behavior

The Agent response is intentionally ignored by PHP. The response exists only so the PHP Shadow Bridge can log whether the local Agent accepted the payload.

## How PHP sends payloads

The R3 PHP Shadow Bridge sends a JSON payload after PHP has already determined its own decision.

The payload schema is:

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
    "action": "allow",
    "reason": "valid_ticket",
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

Cookies and full headers are not sent by default from PHP R3.

## How the Agent stores events

Each received shadow event is normalized into `storage.ShadowEventRecord`:

```text
id
received_at
remote_addr
signature_valid
schema_version
php_action
php_reason
site_host
request_path
payload
storage_version
```

For `engine=jsonl`, each record is written as one JSON object per line. Runtime storage folders are intentionally excluded from release ZIPs.

## In-memory counters

The Agent keeps hot counters in memory for:

- total received
- total stored
- invalid JSON
- signature failures
- action totals: allow, queue, block, wait, pass

Stats endpoint:

```bash
curl http://127.0.0.1:8731/v1/stats
```

Example response:

```json
{
  "ok": true,
  "mode": "shadow",
  "storage_engine": "jsonl",
  "uptime_seconds": 123,
  "received": 10,
  "stored": 10,
  "invalid_json": 0,
  "signature_failed": 0,
  "by_action": {
    "allow": 5,
    "queue": 3,
    "block": 1,
    "wait": 1,
    "pass": 0
  }
}
```

## Build Agent

```bash
cd agent
./scripts/build.sh
```

Output:

```text
agent/bin/unixsee-agent
```

## Run local test

Terminal 1:

```bash
cd agent
./scripts/run-local.sh
```

Terminal 2:

```bash
curl http://127.0.0.1:8731/healthz
curl http://127.0.0.1:8731/readyz
curl http://127.0.0.1:8731/v1/stats
```

Direct shadow POST test:

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

Expected response:

```json
{
  "ok": true,
  "mode": "shadow",
  "stored": true,
  "agent_decision": {
    "action": "observe",
    "reason": "shadow_only"
  }
}
```

## Enable PHP shadow config

In PHP Gateway config:

```php
'agent_shadow_enabled' => true,
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
'agent_shadow_timeout_ms' => 80,
'agent_shadow_log_enabled' => true,
'agent_shadow_secret' => '',
```

Then trigger a normal request through Gateway and check:

```bash
curl http://127.0.0.1:8731/v1/stats
```

## Disable immediately

Set:

```php
'agent_shadow_enabled' => false,
```

Because PHP is still the source of truth, disabling shadow mode immediately stops Agent calls without changing Gateway decisions.

## HMAC signature

PHP R3 can sign the raw JSON body using:

```php
'agent_shadow_secret' => 'change-this-local-secret',
```

The Agent verifies:

```text
X-Unixsee-Agent-Signature: sha256=<hmac>
```

Agent config:

```yaml
security:
  shadow_secret: "change-this-local-secret"
  require_signature: true
```

Rules:

- HMAC is SHA256 over the raw request body.
- Missing/invalid signature returns `401` only when `require_signature=true`.
- If `require_signature=false`, unsigned requests are accepted.
- Secrets are never logged.

## Logs

Default local log path:

```text
./logs/unixsee-agent.log
```

Production path suggestion:

```text
/var/log/unixsee-agent/unixsee-agent.log
```

Structured JSON logs include:

- config loaded summary
- Agent start
- storage opened
- received payload summary
- invalid JSON
- signature failure
- storage errors
- graceful shutdown

Logs intentionally do not include:

- secrets
- full cookies
- sensitive headers
- full payload by default

## Security defaults

- Default bind is local-only: `127.0.0.1:8731`.
- Binding to `0.0.0.0` is refused unless `allow_remote_bind=true`.
- POST body size is capped by `limits.max_body_bytes`.
- Invalid JSON returns `400`.
- Wrong method returns `405`.
- Malformed input must not panic.
- Agent is shadow-only and cannot change production behavior.

## What is not production-ready yet

R4/R4.1 is a receiver and observability skeleton only. It is not yet:

- a decision engine
- a queue authority
- a block/allow authority
- a Redis/NATS realtime worker
- a multi-site control plane
- a decision comparison engine
- an admin dashboard source of truth
- a production BadgerDB event store until the real adapter is implemented

## Next phase plan

R5 should add decision comparison mode:

1. PHP still decides.
2. Agent computes its own candidate decision.
3. PHP decision and Agent candidate are stored side-by-side.
4. Stats expose mismatch counters.
5. No production behavior changes until a later explicit promotion phase.
