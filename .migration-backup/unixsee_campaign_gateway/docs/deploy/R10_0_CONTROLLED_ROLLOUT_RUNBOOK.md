# R10.0 Controlled Rollout Runbook

R10.0 is a controlled production-style staging rollout. It does not enable enforcement and does not introduce remote commands.

## Phase 0: Backup
1. Run core backup with secrets excluded by default.
2. Run client backup with secrets excluded by default.
3. Store secret-inclusive backups only in a secure operator-controlled location.

## Phase 1: Deploy Core
1. Run `deploy/scripts/preflight-core.sh`.
2. Run `deploy/scripts/install-core.sh` or `update-core.sh` with `DRY_RUN=1` first.
3. Apply only after reviewing the plan.
4. Confirm `/healthz`, `/readyz`, `/v1/storage/status`.

## Phase 2: Deploy Agent
1. Run `deploy/scripts/preflight-agent.sh`.
2. Install/update Agent with `DRY_RUN=1` first.
3. Confirm Agent binds only to `127.0.0.1:8731`.
4. Confirm Mother is reachable.

## Phase 3: Deploy PHP Gateway wrapper
1. Keep PHP private runtime outside webroot.
2. Install only the public wrapper under `/unixsee-gateway/gateway.php`.
3. Do not copy docs, tools, src, logs, storage, agent, mother, or deploy folders into webroot.

## Phase 4: Verify Gateway endpoint
- Gateway must continue to return `{"status":"pass"...}`.
- PHP remains runtime source of truth.

## Phase 5: Verify Agent telemetry
- Agent policy/config pull succeeds.
- Telemetry reaches Mother.
- `/v1/agents` and `/v1/diagnostics/summary` show fresh data.

## Phase 6: Verify Dashboard
- Dashboard requires login.
- RBAC role appears in topbar/sidebar.
- `/settings/production` shows readiness indicators.

## Phase 7: Save draft config
- Save a draft in `/gateway`.
- This only updates Mother state.
- No site files are touched.

## Phase 8: Publish config
- Publish with a note.
- Publish creates an immutable version.
- Agent receives it on the next pull interval.

## Phase 9: Verify delivery/ack
- Check config sync status.
- Delivery is marked on policy pull.
- Acknowledgement is marked from Agent telemetry metadata.

## Phase 10: Rollback test
- Rollback creates a new version copied from the selected version.
- Old versions are not mutated except safe status metadata.

## Phase 11: Keep shadow-only
- Do not enable enforcement.
- Do not add block/enforce UI.
- Do not run remote commands from Dashboard.

## Phase 12: Post-rollout monitoring
- Monitor telemetry freshness.
- Monitor mismatch counters.
- Monitor audit trail.
- Keep rollback archives until the staging window is complete.

## R10.3 beta hardening gate

Before starting a controlled beta target, collect release evidence and review `/release`. Release gates are readiness checks only; they do not enable enforcement or execute remediation.
