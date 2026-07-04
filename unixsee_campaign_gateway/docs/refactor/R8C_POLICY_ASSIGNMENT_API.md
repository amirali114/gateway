# R8C Policy Assignment API

R8C adds a local/dev Mother policy management and assignment API. PHP remains the production source of truth. The Agent remains shadow-only and does not enforce Mother decisions.

## Scope

R8C is API-only policy assignment work:

- list policies
- read a policy by ID
- create/update policies in Mother memory storage
- assign a policy to an Agent
- read/remove an assignment
- keep Agent policy pull behavior compatible

No PostgreSQL is faked in R8C. R8A remains pending until a build environment can provide the real `pgx` PostgreSQL driver.

## Management config

```yaml
management:
  enabled: true
  write_enabled: false
```

Read endpoints are enabled by default. Write endpoints are disabled by default and return:

```json
{"ok":false,"error":"management writes are disabled"}
```

This is intentional. There is no authentication layer yet, so write APIs are for controlled local/dev use only.

## Read endpoints

```http
GET /v1/policies
GET /v1/policies/{policy_id}
GET /v1/agents/{agent_id}/policy-assignment
```

`GET /v1/policies/default` is the normal read endpoint for the policy whose ID is `default`. The debug endpoint is separate:

```http
GET /v1/debug/policies/default
```

The debug endpoint is disabled by default through `debug.enabled=false`.

## Write endpoints

Enable writes only in a trusted local/dev config:

```yaml
management:
  enabled: true
  write_enabled: true
```

Create policy:

```bash
curl -sS -X POST http://127.0.0.1:8732/v1/policies \
  -H 'Content-Type: application/json' \
  --data @policy.json
```

Assign policy:

```bash
curl -sS -X POST http://127.0.0.1:8732/v1/agents/local-dev-agent/policy-assignment \
  -H 'Content-Type: application/json' \
  --data '{"policy_id":"campaign-shadow-v1"}'
```

Remove assignment:

```bash
curl -sS -X DELETE http://127.0.0.1:8732/v1/agents/local-dev-agent/policy-assignment
```

## Validation

Every written policy is validated before storage. Invalid actions, fail modes, campaign modes, managed methods, sources, empty IDs, and unknown policy assignments are rejected.

## Agent behavior

The Agent still calls:

```http
GET /v1/agents/{agent_id}/policy
```

Mother returns the assigned policy if one exists. Otherwise it returns the default policy. The Agent remains shadow-only and applies its normal fallback behavior if Mother is unavailable.

## Not implemented

- PostgreSQL persistence
- dashboard write UI
- remote commands
- enforcement
- billing/auth

## Next phase options

- R8C.1 dashboard read-only assignment view
- R8D installer/test plan
- R8A PostgreSQL persistence in a pgx-enabled environment

## R8C.2 dashboard visibility

R8C.2 adds read-only Dashboard visibility for the R8C policy APIs.

Dashboard pages now read:

```http
GET /v1/policies
GET /v1/policies/default
GET /v1/agents/local-dev-agent/policy-assignment
GET /v1/debug/policies/default
```

The Dashboard does not call POST, PUT, or DELETE endpoints. It does not include policy edit forms or assignment controls. The assignment block is visibility-only and is meant to clarify the difference between Mother assigned policy and Agent effective policy.
