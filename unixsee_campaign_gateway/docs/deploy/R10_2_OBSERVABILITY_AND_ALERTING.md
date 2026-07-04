# R10.2 Observability and Alerting

## Alert model

Mother alert records contain: id, timestamp, updated_at, agent_id, scope, type, severity, status, title, message, safe metadata, first_seen_at, last_seen_at, resolved_at, occurrence_count and fingerprint.

Statuses:

- active
- resolved
- muted

Severities:

- info
- warn
- critical

Scopes:

- mother
- dashboard
- agent
- gateway
- storage
- rollout
- security

Alerts are deduplicated by fingerprint. Repeated issues update `occurrence_count` and `last_seen_at` instead of creating noisy duplicate rows.

## Built-in rules

R10.2 includes conservative rules for:

- storage health and volatile storage
- PostgreSQL unavailable/fail-safe profile
- telemetry missing/stale/critical stale
- low shadow match rate and mismatch
- invalid JSON/signature failure counters
- config pending delivery/ack/stale
- recent rollback visibility
- management token missing while write API is enabled

Alerts are visibility only. They do not trigger enforcement, remote commands or automatic remediation.

## API endpoints

- `GET /v1/alerts`
- `GET /v1/alerts/summary`
- `GET /v1/alerts/{alert_id}`
- `POST /v1/alerts/{alert_id}/resolve`
- `POST /v1/alerts/{alert_id}/mute`
- `POST /v1/alerts/{alert_id}/unmute`
- `POST /v1/alerts/evaluate`
- `GET /v1/health/report`

POST endpoints are protected by the Mother management token and must be called server-side by Dashboard.

## Dashboard

The `/alerts` page is Persian RTL and shows active counters, alert list, severity badges, scope, agent id, first/last seen, occurrence count and safe metadata. RBAC behavior:

- viewer: read-only
- operator: read-only unless `alerts.manage` is granted
- admin/owner: resolve/mute/unmute

## Notification placeholder

No external notification channel is enabled by default.

```yaml
notifications:
  enabled: false
  channels: []
```

Webhook/email integrations are intentionally out of scope for R10.2.

## R10.3 integration

R10.3 uses the R10.2 alert summary and health report as inputs for release gates. Critical active alerts block beta readiness; warning alerts require operator review. Alerts remain internal visibility only and never trigger automatic remediation or enforcement.
