# R9.1 Functional Mother-backed Control Plane

R9.1 moves the dashboard beyond passive local monitoring and introduces a Mother-backed staging control plane.

## What changed

- Mother now maintains an in-memory Agent registry populated automatically by policy pulls.
- Mother exposes `GET /v1/agents` and `GET /v1/agents/{agent_id}`.
- Mother now supports staged control-plane config drafts and publishes:
  - `GET /v1/agents/{agent_id}/control-plane`
  - `GET /v1/agents/{agent_id}/config`
  - `POST /v1/agents/{agent_id}/config/draft`
  - `POST /v1/agents/{agent_id}/config/publish`
  - `GET /v1/agents/{agent_id}/config/history`
- Policy pull responses include forward-compatible `control_plane` metadata inside the policy payload.
- Dashboard `/agents` now reads the real Mother registry instead of hardcoded `local-dev-agent`.
- Dashboard `/agents/[agent_id]` provides Agent detail, active config, draft config, history, and safe draft/publish controls.
- Dashboard `/gateway` provides a product-facing Gateway control page with per-Agent selection and Mother draft/publish flow.

## Security model

- PHP Gateway remains the runtime source of truth.
- Go Agent remains shadow-only.
- Dashboard writes only to Mother APIs.
- Mother stores draft/published config in memory for now.
- Agent pulls policy/config on its own schedule; Mother is not in the request hot path.
- No remote shell commands are exposed.
- No dashboard write goes directly to site files or WordPress.
- No PostgreSQL is added in this phase.

## Control config validation

The R9.1 config model accepts only staging-safe fields:

- `gateway.mode` must be `shadow`.
- `gateway.default_action` must be `allow` or `pass`.
- `storage.fail_mode` must be `open` or `closed`.
- Unknown fields are rejected on draft writes.

## Old PHP panel feature inventory

The old PHP panel/runtime files in this package include login protection, dashboard stats, bot analytics, queue/session controls, ticket cookie settings, storage fail mode, bot scoring/DNS validation, latency-aware queue helpers, and static queue shell management. R9.1 maps only the safe high-level control surfaces into Mother-backed staging config: gateway status, campaign status, queue status, bot module status, storage fail mode, and default action. Runtime enforcement and direct PHP file editing remain intentionally excluded.

## How to test on staging

1. Start Mother with local bind.
2. Start Agent configured to pull from Mother.
3. Wait for the Agent to pull policy.
4. Check `GET /v1/agents` and verify the Agent appears.
5. Open `/agents`, `/agents/<agent_id>`, and `/gateway` in Dashboard.
6. Save a draft, publish it, and wait for the next Agent pull.
7. Confirm PHP Gateway behavior is unchanged.

## Still intentionally not implemented

- PostgreSQL persistence.
- Dashboard auth.
- Remote commands.
- Enforcement mode.
- Direct site file writes.
- Production web server exposure.
