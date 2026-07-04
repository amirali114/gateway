# Unixsee Campaign Gateway R10.2

## Added

- Mother alert model with persistent JSON storage.
- Alert deduplication by fingerprint.
- Alert summary aggregation.
- Alert endpoints and safe management actions.
- `/v1/health/report` now includes alert summary and safe security flags.
- Persian RTL Dashboard alert center at `/alerts`.
- Overview, Agents, Agent Detail and Diagnostics observability summaries.
- `deploy/scripts/validate-observability.sh`.
- `deploy/scripts/collect-health-report.sh`.
- R10.2 observability docs.

## Unchanged safety model

- Agent remains shadow-only.
- Enforcement remains disabled.
- No remote command execution.
- Browser never receives Mother management token.
- R10.1 PHP wrapper/private runtime separation remains intact.
