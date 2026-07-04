# R10.0 Production Readiness Controlled Rollout

## Summary
R10.0 stops feature expansion and focuses on controlled production-style staging rollout readiness.

## Added
- Standard deployment paths.
- Core/Agent/PHP installer, updater, rollback scripts.
- Core/Agent/PHP preflight scripts.
- Backup/restore scripts for core and client state.
- Master production readiness validator.
- Release security scanner.
- Mother `/v1/health/report` endpoint.
- Dashboard `/settings/production` Persian RTL readiness page.
- Deployment runbook, checklist, installation, upgrade, rollback and security model docs.

## Safety model
- PHP Gateway remains source of truth.
- Agent remains shadow-only.
- No enforcement.
- No remote shell execution.
- No direct Dashboard-to-Agent production fetch.
- Dashboard writes only to Mother server-side APIs.
- Browser never receives management token.

## Automated test summary
See the release response for the exact validation output. The intended validation set is PHP lint/self-test, Go tests/builds, Dashboard build, shell syntax checks, release scan, security scan and final ZIP scan.

## Remaining limitations
- PostgreSQL optional.
- JSON storage staging-grade.
- Local RBAC only; no SSO/OAuth or 2FA.
- No HA clustering.
- Agent shadow-only.
