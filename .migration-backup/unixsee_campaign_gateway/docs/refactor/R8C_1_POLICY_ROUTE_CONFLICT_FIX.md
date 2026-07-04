# R8C.1 Policy Route Conflict Fix

R8C introduced a normal policy resource endpoint at `GET /v1/policies/{policy_id}` while older Mother builds already used `GET /v1/policies/default` as a debug-only endpoint. Since the default policy ID is `default`, the old debug route shadowed the normal policy read endpoint.

## What changed

- `GET /v1/policies/default` now reads the normal policy record with ID `default`.
- The old debug endpoint moved to `GET /v1/debug/policies/default`.
- The debug endpoint remains disabled unless `debug.enabled=true`.
- Management write endpoints remain disabled by default through `management.write_enabled=false`.

## Compatibility

These endpoints remain compatible:

```http
GET /healthz
GET /readyz
GET /v1/policies
GET /v1/policies/{policy_id}
GET /v1/debug/policies/default
GET /v1/agents/{agent_id}/policy
GET /v1/agents/{agent_id}/policy-assignment
POST /v1/agents/{agent_id}/policy-assignment
DELETE /v1/agents/{agent_id}/policy-assignment
```

## Dashboard

The dashboard remains read-only. Its Mother page now checks both:

- `/v1/policies/default` for the normal default policy read.
- `/v1/debug/policies/default` for debug-only endpoint status.

## Safety

PHP remains the production source of truth. The Agent remains shadow-only. This phase only fixes a Mother route conflict; it does not add enforcement, remote commands, fake PostgreSQL, or dashboard write UI.
