# R10.3 Controlled Beta Staging Hardening

## Added

- Mother release gate endpoints: `/v1/release-gates` and `/v1/release-gates/summary`.
- Health report release fields: release gate summary, blockers, warnings, public exposure status, shadow-only safety status, backup/restore status.
- Persian RTL Dashboard page `/release` with readiness score, blockers, warnings, all gates, latest health report, latest alerts, and beta checklist.
- Overview release readiness summary.
- Release evidence collection script.
- Core/client backup restore drill scripts.
- Controlled rollout simulation script.
- Shadow-only safety validation script.
- Public exposure hardening validation script.
- Incident response runbook and beta operator checklist.

## Safety

- No enforcement added.
- No remote command execution added.
- Agent remains local-only by default.
- Public PHP wrapper/private runtime model remains unchanged.
- Dashboard still uses Mother APIs only.
