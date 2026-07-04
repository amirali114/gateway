# R10.0 Upgrade

1. Run backups.
2. Run `preflight-core.sh`, `preflight-agent.sh`, and `preflight-php-gateway.sh` where applicable.
3. Run update scripts in dry-run mode.
4. Apply update scripts only after reviewing changes.
5. Run `validate-production-readiness.sh`.

Upgrade scripts preserve:
- `/etc/unixsee-gateway/*`
- `/var/lib/unixsee-gateway/mother`
- `/var/lib/unixsee-gateway/dashboard`
- `/var/lib/unixsee-gateway/agent`
- PHP private runtime
- public wrapper backup

Existing sessions may be invalidated by auth/RBAC upgrades. That is safe.
