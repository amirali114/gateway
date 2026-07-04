# R10.2 Health Report Guide

## Endpoint

`GET /v1/health/report` returns a safe aggregate report:

- Mother health
- readiness
- storage status
- agent registry summary
- telemetry summary
- config rollout summary
- alert summary
- recent warning/critical events
- safe security configuration flags

The response must not include secrets, tokens, cookies, full DSN passwords, session secrets or HMAC shared secrets.

## Script

Use:

```bash
MOTHER_URL=http://127.0.0.1:8732 deploy/scripts/collect-health-report.sh
```

JSON output:

```bash
REPORT_JSON=1 OUTPUT=/tmp/unixsee-health.json MOTHER_URL=http://127.0.0.1:8732 deploy/scripts/collect-health-report.sh
```

Validation:

```bash
MOTHER_URL=http://127.0.0.1:8732 deploy/scripts/validate-observability.sh
```

`TEST_MODE=1` can trigger `POST /v1/alerts/evaluate` only when `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` is provided. The script never prints the token.
