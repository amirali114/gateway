# R10.2 Observability / Alerting / Runtime Health

R10.2 adds staging-grade operational visibility on top of the R10.1 deployment cleanup. It does not change runtime enforcement behavior.

## Scope

- Mother stores persistent alert records.
- Mother evaluates conservative built-in alert rules.
- Dashboard reads alerts through Mother APIs only.
- Dashboard provides Persian RTL alert center at `/alerts`.
- Operators can collect a safe health report with `deploy/scripts/collect-health-report.sh`.

## Safety invariants

- PHP Gateway remains runtime source of truth.
- Agent remains shadow-only.
- No enforcement UI is added.
- No remote command execution is added.
- Agent remains local-only by default.
- Browser never receives Mother management token.
- Public PHP Gateway remains wrapper-only; private runtime stays outside webroot.
