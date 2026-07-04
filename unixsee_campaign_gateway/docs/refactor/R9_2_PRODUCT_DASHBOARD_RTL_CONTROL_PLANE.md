# R9.2 Product Dashboard RTL Control Plane

## Summary

R9.2 moves the dashboard from engineering-oriented pages into a Persian RTL Mother-backed control plane for staging operations. PHP Gateway remains the runtime source of truth, the Go Agent remains shadow-only, and the dashboard does not call Agent directly on production pages.

## Dashboard pages changed

- `/` نمای کلی: Mother health, Agent registry summary, online/stale/unknown counts, policy version summary, recent policy pulls, and staging/shadow warnings.
- `/agents`: real Mother Agent registry table from `GET /v1/agents`; no production `local-dev-agent` hardcoding.
- `/agents/[agent_id]`: Agent overview, connection status, policy assignment, active config, draft config, config history, and Mother draft/publish actions.
- `/gateway`: primary product control page with Agent selector, gateway/campaign/queue/bot toggles, fail mode, default action, shadow-only lock, draft panel, publish action, and safety notice.
- `/policy`: Mother policy list and default policy preview.
- `/diagnostics`: Mother-side health/readiness and Agent registry diagnostics placeholder.
- `/settings`: Mother base URL, local-only dashboard mode, security model, and management-read status.

## Mother-backed flow

The dashboard uses Mother APIs as the production backend:

- `GET /healthz`
- `GET /readyz`
- `GET /v1/agents`
- `GET /v1/agents/{agent_id}`
- `GET /v1/agents/{agent_id}/control-plane`
- `GET /v1/agents/{agent_id}/config`
- `POST /v1/agents/{agent_id}/config/draft`
- `POST /v1/agents/{agent_id}/config/publish`
- `GET /v1/agents/{agent_id}/config/history`
- `GET /v1/agents/{agent_id}/policy-assignment`
- `GET /v1/policies`
- `GET /v1/policies/default`

Direct Agent API access is intentionally not used by production dashboard pages. Future debug tooling may use it only when clearly labeled as debug-only.

## Safety model

- PHP Gateway remains the runtime source of truth.
- Go Agent remains shadow-only.
- No enforce mode exists.
- No remote shell execution exists.
- Dashboard writes only to Mother draft/publish endpoints.
- Dashboard does not write site files, PHP files, WordPress files, or web server config.
- Dashboard should remain local-only unless a later authenticated/reverse-proxied deployment phase explicitly changes that.

## Remaining limitations

- Mother persistence is still memory/json-style state; PostgreSQL is not added in R9.2.
- Diagnostics are limited to Mother-side registry/health in production pages; shadow comparator aggregation should be exposed through Mother in a later phase.
- There is no auth layer yet.
- There is no dashboard write UI for policy creation/assignment beyond per-agent config draft/publish.
- There is no enforcement or live runtime push.

## How to deploy later

Deploy only on a backup/staging server first. Keep dashboard bound to `127.0.0.1`, run Mother locally or behind a protected internal network, and confirm Agent policy pulls before enabling any PHP shadow bridge on a staging WordPress copy.

## Automated test result summary

R9.2 validation requires:

- PHP lint and release scan.
- Go test/build for Agent and Mother.
- Dashboard `npm ci` and `npm run build`.
- Search checks for production UI hardcoding and internal npm registry URLs.
