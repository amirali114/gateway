# R10.1 First Real Staging Deployment Package Cleanup

R10.1 is an operational cleanup release. It does not add enforcement, remote commands, or Dashboard-to-Agent direct control.

Main changes:
- minimal public PHP wrapper added
- private PHP runtime install/update/rollback added
- Core/Agent install/update/rollback paths standardized
- Agent systemd example added
- source vs installed runtime validation split
- staging config examples now use absolute paths
- deployment artifact manifest added
- first staging runbook added
- PostgreSQL status documented honestly as optional/profile/fail-safe unless driver-enabled
