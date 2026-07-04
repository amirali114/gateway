# R8C.2 Dashboard Policy Assignment Read-Only View

R8C.2 adds read-only visibility for Mother policies and policy assignment state in the local/dev Dashboard.

PHP remains the production source of truth. The Agent remains shadow-only. Mother remains a local/dev policy provider. This phase does not add enforcement, write UI, remote commands, authentication, billing, or PostgreSQL persistence.

## What changed

The Dashboard now shows policy information from both sides of the shadow control plane:

- Agent effective policy from `GET /v1/policy/effective`
- Mother policy list from `GET /v1/policies`
- Mother default policy details from `GET /v1/policies/default`
- Mother assignment for `local-dev-agent` from `GET /v1/agents/local-dev-agent/policy-assignment`
- Mother debug default policy status from `GET /v1/debug/policies/default`

All calls are read-only `GET` calls.

## Policy page

`/policy` now has three read-only sections:

1. Agent Effective Policy
2. Mother Policies
3. Default Policy Details

This makes it clear that the Agent may be using a Mother-assigned policy, a Mother default policy, a local fallback, or a last-known-good cached policy depending on policy sync status.

## Agents page

`/agents` now includes a policy assignment block for `local-dev-agent`.

If an assignment exists, the page shows the assigned `policy_id` and notes that Mother returns that assigned policy on Agent refresh.

If no assignment exists, the page explicitly says:

```text
Agent falls back to Mother default policy.
```

## Mother page

`/mother` now separates normal policy reads from debug reads:

- `GET /v1/policies/default` is the normal management read endpoint for the default policy record.
- `GET /v1/debug/policies/default` is debug-only and disabled by default.

The Dashboard also states that write endpoints are intentionally not exposed.

## Security posture

R8C.2 does not add:

- POST/PUT/DELETE calls from the Dashboard
- policy edit forms
- assignment forms
- remote command buttons
- secret fields
- auth or billing

The Dashboard is still local/dev only. Do not expose it publicly without authentication and reverse-proxy protection.

## Relationship between Mother assignment and Agent effective policy

Mother assignment controls what policy Mother will return to the Agent when the Agent refreshes policy.

Agent effective policy is what the Agent is currently using. It may differ temporarily from Mother assignment if:

- the Agent has not refreshed yet
- Mother is unavailable
- the Agent is using last-known-good policy
- the Agent is using fallback default policy

This difference is expected and useful for diagnostics.

## Next phase options

- R8D installer/test plan
- R8A PostgreSQL persistence in a pgx-enabled Go environment
- R8E controlled Dashboard write UI behind disabled-by-default management writes
