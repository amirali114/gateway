# R4.1 — Storage Honesty and Badger Adapter Preparation

## What R4.1 fixes

R4 introduced a working Go shadow receiver. Its storage layer wrote durable append-only JSON Lines, but the implementation was named `BadgerStore` and lived in `badger.go`.

That was misleading because the code did not use real BadgerDB.

R4.1 fixes the naming and architecture:

```text
storage.Store interface
storage.JSONLStore implementation
```

The fake Badger naming is removed.

## Current storage engines

R4.1 supports storage engine selection in config:

```yaml
storage:
  engine: "jsonl"
  path: "./data/agent-events"
  sync_writes: false
```

Supported engine names:

```text
jsonl
badger
```

Implementation status:

- `jsonl`: implemented
- `badger`: reserved for a future real BadgerDB adapter

## JSONL storage

`JSONLStore` is honest and simple:

- append-only JSON Lines
- one `ShadowEventRecord` per line
- creates parent directory if missing
- concurrency-safe writes
- optional fsync via `sync_writes`
- good enough for local shadow testing and early debug

For this config:

```yaml
storage:
  engine: "jsonl"
  path: "./data/agent-events"
```

The event file is:

```text
./data/agent-events/shadow-events.jsonl
```

Runtime JSONL files must never be included in release ZIPs.

## BadgerDB target

BadgerDB is still the intended production embedded KV store for the Agent.

The intended dependency is:

```text
github.com/dgraph-io/badger/v4
```

The real future adapter should:

- open BadgerDB at `storage.path`
- store key `shadow:event:<unix_nano>:<random_suffix>`
- store JSON value of `ShadowEventRecord`
- honor `sync_writes`
- include tests

## What happens with engine=badger now

Because this environment cannot fetch external Go dependencies, R4.1 does **not** ship a fake BadgerDB adapter.

If config selects:

```yaml
storage:
  engine: "badger"
```

Agent startup fails with this clear error:

```text
storage engine badger requested but real BadgerDB implementation is not available
```

There is no silent fallback from Badger to JSONL. Explicit Badger means real Badger or fail.

## Why PHP remains source of truth

R4.1 does not change the Gateway decision flow.

PHP still controls:

- allow
- queue
- block
- wait
- pass
- tickets
- redirects
- waiting room rendering
- WordPress loading
- storage fail-open/fail-close policy

The Agent response is ignored by PHP and only confirms that the shadow payload was received and stored.

## API compatibility

The shadow receiver remains compatible with R4:

```http
POST /v1/shadow/decision
```

Response shape remains:

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

Readiness now includes storage engine:

```json
{
  "ok": true,
  "storage": "ok",
  "storage_engine": "jsonl"
}
```

Stats now includes storage engine:

```json
{
  "ok": true,
  "mode": "shadow",
  "storage_engine": "jsonl",
  "received": 10,
  "stored": 10
}
```

## How to test

```bash
cd agent
go test ./...
./scripts/build.sh
./scripts/run-local.sh
```

Then:

```bash
curl http://127.0.0.1:8731/healthz
curl http://127.0.0.1:8731/readyz
curl http://127.0.0.1:8731/v1/stats
```

Send a shadow event:

```bash
curl -sS -X POST http://127.0.0.1:8731/v1/shadow/decision \
  -H 'Content-Type: application/json' \
  --data-binary '{"schema_version":"r3.shadow.v1","timestamp":1710000000,"site":{"host":"example.com","scheme":"https"},"request":{"ip":"1.2.3.4","method":"GET","path":"/product/test","query":"a=1","user_agent":"Mozilla/5.0","referer":"","accept":"","is_ajax":false},"php_decision":{"action":"allow","reason":"valid_ticket","status":200,"retry_after":5},"runtime":{"storage_available":true,"storage_fail_mode":"open","gateway_enabled":true,"campaign_enabled":true}}'
```

## Disable Agent shadow calls immediately

In PHP config:

```php
'agent_shadow_enabled' => false,
```

This stops calls to the Agent. Gateway production behavior remains unchanged.

## Next phase

R5 should add decision comparator mode while keeping PHP authoritative:

1. PHP decision is stored.
2. Agent computes a candidate decision.
3. Both decisions are compared.
4. Mismatch counters are exposed.
5. No user-facing behavior changes until an explicit later promotion phase.
