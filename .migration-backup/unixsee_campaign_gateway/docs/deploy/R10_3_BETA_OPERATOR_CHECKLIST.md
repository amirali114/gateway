# R10.3 Beta Operator Checklist

Use this checklist for the first controlled beta staging target. Record evidence before go/no-go.

## Target

- Operator name:
- Date/time UTC:
- Target site:
- Agent ID:
- Core server:
- Client server:
- Package filename:
- Package SHA256:

## Checklist

- [ ] Package hash recorded.
- [ ] Core backup completed.
- [ ] Client backup completed.
- [ ] Core restore drill dry-run passed.
- [ ] Client restore drill dry-run passed.
- [ ] Core preflight passed.
- [ ] Client preflight passed.
- [ ] PHP wrapper exposure validation passed.
- [ ] Public exposure hardening validation passed.
- [ ] Mother `/healthz` passed.
- [ ] Mother `/readyz` passed.
- [ ] Storage status passed.
- [ ] Dashboard auth/RBAC passed.
- [ ] Alerts summary checked.
- [ ] Health report collected.
- [ ] Release evidence collected.
- [ ] Agent telemetry fresh.
- [ ] Config rollout simulation passed.
- [ ] Shadow-only safety passed.
- [ ] Rollback procedure reviewed.
- [ ] Incident response runbook reviewed.
- [ ] Final go/no-go decision recorded.

## Decision

- Go/no-go:
- Blockers:
- Accepted warnings:
- Notes:
