# R10.1 First Real Staging Deployment Runbook

## Phase 0: Architecture limits
PHP Gateway is runtime source of truth. Go Agent is shadow-only. Enforcement is disabled. Dashboard talks only to Mother APIs. Browser never receives the Mother management token. No remote shell command execution exists. Public PHP is wrapper-only; private runtime stays outside webroot.

## Phase 1: Prepare Core server
Required tools: `bash`, `rsync`, `tar`, `go`, `node`, `npm`, `systemd`. Standard paths are `/opt/unixsee-campaign-gateway`, `/etc/unixsee-gateway`, `/var/lib/unixsee-gateway`, and `/var/log/unixsee-gateway`.

## Phase 2: Generate secrets
Generate Mother management token, Mother-Agent shared secret, Dashboard session secret, and Dashboard bootstrap admin password hash. Store secrets under `/etc/unixsee-gateway` with restrictive permissions. Do not print secrets into logs.

## Phase 3: Write Core config/env
Use `deploy/examples/core/mother.staging.yml`, `deploy/examples/core/mother.env.example`, and `deploy/examples/dashboard/dashboard.env.example`. JSON storage is the staging default. PostgreSQL remains optional/profile/fail-safe unless a driver-enabled build is explicitly provided.

## Phase 4: Build/install Core
Dry-run first with `DRY_RUN=1 deploy/scripts/install-core.sh`. Apply only with `APPLY=1 DRY_RUN=0`. Service enable/start requires explicit `ENABLE_SERVICES=1` and `START_SERVICES=1`.

## Phase 5: Start Mother
Start `unixsee-mother.service` only after config and secrets exist. Confirm `/readyz`, storage status, and bind address. Default bind is `127.0.0.1:8732`.

## Phase 6: Start Dashboard
Dashboard binds to `127.0.0.1:8740` by default. Confirm login required, RBAC bootstrap, audit append, and no browser-visible management token.

## Phase 7: Configure reverse proxy
Put Dashboard behind HTTPS/auth-aware reverse proxy. OpenLiteSpeed and Nginx examples remain under `deploy/`. Use secure headers and cookie settings.

## Phase 8: Validate Dashboard security
Run `validate-dashboard-security.sh` and check protected routes, RBAC, audit, and static bundle secret scan.

## Phase 9: Prepare Client/Site server
Identify webroot. Agent stays local-only on `127.0.0.1:8731`. Do not publish Agent.

## Phase 10: Install private PHP runtime
Run `deploy/scripts/install-php-gateway-runtime.sh`. Target must be outside webroot, normally `/opt/unixsee-campaign-gateway/unixsee_campaign_gateway`.

## Phase 11: Install public wrapper only
Run `UXGW_WEBROOT=/path/to/public_html APPLY=1 DRY_RUN=0 deploy/scripts/install-php-gateway-wrapper.sh`. Validation hard-fails if private runtime files appear under webroot.

## Phase 12: Install Agent
Use `deploy/examples/client/agent.staging.yml`. Preserve `/etc/unixsee-gateway/mother-agent.secret`. Run `install-agent.sh`; start service only with explicit flags.

## Phase 13: Verify Agent connectivity
Confirm policy pull from Mother, telemetry push, and local bind. For remote Agents, Mother `0.0.0.0:8732` is allowed only with explicit config and firewall allowlist.

## Phase 14: Verify PHP Gateway endpoint
Confirm endpoint returns expected pass JSON and stats increment. Probe forbidden files and expect `403/404`.

## Phase 15: Dashboard control plane
Confirm Agent appears, telemetry appears, draft config saves, publish updates Mother config, delivery/ack is observed. Publish does not run remote commands.

## Phase 16: Rollback test
Test rollback scripts for core, agent, private PHP runtime, and public wrapper using timestamped backup archives.

## Phase 17: Monitoring
Watch Mother logs, Agent logs, Dashboard audit, and periodic validation output.

## R10.3 beta hardening addendum

Before a controlled beta staging go/no-go, run the R10.3 evidence and safety checks:

- `validate-shadow-only-safety.sh`
- `validate-public-exposure-hardening.sh`
- `collect-release-evidence.sh`
- `drill-backup-restore-core.sh`
- `drill-backup-restore-client.sh`
- `simulate-controlled-rollout.sh` in read-only mode or against a dummy Agent only

Then record the result in `R10_3_BETA_OPERATOR_CHECKLIST.md`. Release gates are operational checks only and do not enable enforcement.
