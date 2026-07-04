# R10.3 Release Evidence Collection

Run `deploy/scripts/collect-release-evidence.sh` from an installed runtime to produce safe beta evidence.

Example:

```bash
MOTHER_URL=http://127.0.0.1:8732 \
DASHBOARD_URL=http://127.0.0.1:8740 \
OUTPUT_DIR=/root/unixsee-r10.3-evidence \
deploy/scripts/collect-release-evidence.sh
```

Collected evidence includes Mother health, readiness, storage status, health report, alert summary, agents, diagnostics, release gate summary, service status summaries, bind summaries, optional Dashboard public check, optional PHP Gateway endpoint check, and optional Agent detail.

The script redacts Authorization headers, cookies, DSN passwords, tokens, session secrets, and password-like values. It does not dump env files.
