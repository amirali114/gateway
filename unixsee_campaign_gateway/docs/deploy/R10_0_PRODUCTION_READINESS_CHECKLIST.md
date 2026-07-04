# R10.0 Production Readiness Checklist

This checklist is for the first controlled production-style staging rollout. It does not enable enforcement.

## Core server
- Code path: `/opt/unixsee-campaign-gateway/unixsee_campaign_gateway`
- Config path: `/etc/unixsee-gateway/mother.yml`
- Env files: `/etc/unixsee-gateway/mother.env`, `/etc/unixsee-gateway/dashboard.env`
- State: `/var/lib/unixsee-gateway/mother`, `/var/lib/unixsee-gateway/dashboard`
- Logs: `/var/log/unixsee-gateway`
- Dashboard listens on `127.0.0.1:8740` only.
- Mother listens on `127.0.0.1:8732` by default; remote Agent access requires firewall allowlist.

## Client server
- Agent config: `/etc/unixsee-gateway/agent.yml`
- Agent shared secret: `/etc/unixsee-gateway/mother-agent.secret`
- Agent state: `/var/lib/unixsee-gateway/agent`
- Agent logs: `/var/log/unixsee-gateway`
- Agent binds to `127.0.0.1:8731` only.

## PHP Gateway
- Public wrapper only: `/unixsee-gateway/gateway.php`
- Private runtime must stay outside webroot.
- Sensitive folders such as `src`, `tools`, `docs`, `install`, `deploy`, `logs`, `mother`, `agent`, and runtime state must not be under public webroot.
- Gateway endpoint should continue to return `{"status":"pass"...}`.

## Agent
- Shadow-only mode.
- No public bind.
- Mother reachable for policy/config pull and telemetry push.
- Telemetry fresh within expected interval.

## Mother
- `/healthz`, `/readyz`, `/v1/storage/status`, `/v1/health/report` return healthy responses.
- Management writes require token.
- Config rollout publish/rollback endpoints remain token protected.

## Dashboard
- Auth enabled.
- RBAC user store initialized.
- Audit trail writable.
- Management token configured server-side only.
- No secret values in client bundle.

## Storage
- JSON storage is acceptable for staging.
- PostgreSQL profile is optional for production persistence.
- Storage path is outside webroot and writable by the service user.
- Backup/restore tested before rollout.

## Reverse proxy / HTTPS
- Expose only HTTPS reverse proxy.
- Proxy to `http://127.0.0.1:8740`.
- Set `DASHBOARD_PUBLIC_BASE_URL` and `DASHBOARD_TRUST_PROXY=true`.
- Forward `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Real-IP`.

## Firewall
- Public: 80/443 only as needed.
- Never expose 8731.
- Never expose 8740.
- Expose 8732 only if remote Agents need it and only to trusted source IPs/proxy exits.

## Backup / restore
- Run `deploy/scripts/backup-core-state.sh` and `deploy/scripts/backup-client-state.sh` before updates.
- Use `INCLUDE_SECRETS=1` only when the archive is stored securely.
- Test restore on staging before production-style rollout.

## Rollback
- Core rollback script requires `RESTORE_ARCHIVE`.
- Agent rollback script requires `RESTORE_ARCHIVE`.
- PHP wrapper rollback script requires `RESTORE_ARCHIVE`.
- Rollback never enables enforcement.

## Monitoring
- Watch dashboard diagnostics.
- Watch `/v1/diagnostics/summary` and `/v1/health/report`.
- Confirm config delivery and acknowledgement metadata.
- Confirm PHP Gateway behavior remains pass/source-of-truth.

## Known limitations
- Agent remains shadow-only.
- Enforcement is not enabled.
- PostgreSQL is optional.
- JSON storage is staging-grade.
- RBAC is local; no SSO/OAuth.
- No 2FA.
- No HA clustering.
- No remote command execution.

## R10.3 controlled beta gates

- [ ] `/v1/release-gates/summary` reviewed.
- [ ] Dashboard `/release` reviewed.
- [ ] `collect-release-evidence.sh` output attached to internal release note.
- [ ] Core/client backup restore drill dry-runs completed.
- [ ] `validate-shadow-only-safety.sh` passed.
- [ ] `validate-public-exposure-hardening.sh` reviewed/passed for target exposure model.
- [ ] Incident response runbook reviewed.
- [ ] Beta operator checklist signed off.
