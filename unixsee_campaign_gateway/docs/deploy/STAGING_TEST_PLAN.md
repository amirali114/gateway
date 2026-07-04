# Staging Test Plan

Use this plan only on a backup or staging server. Do not run it against a live production storefront without an explicit maintenance/test decision.

## 1. Preflight

Confirm:

- The server is backup/staging, not the production domain.
- PHP, Go, Node/npm, curl, and unzip are installed.
- Ports `8731`, `8732`, and optional dashboard port `8740` are free.
- These ports are bound to `127.0.0.1` only.
- There is no existing `unixsee-agent`, `unixsee-mother`, or `unixsee-dashboard` service conflict.
- You have a rollback path before touching any PHP Gateway files.

## 2. Package validation

From the package root:

```bash
bash install/validate-package.sh
```

Expected result: all PHP, Go, Dashboard, and release-scan checks pass.

## 3. Local smoke test

```bash
bash install/run-smoke-test.sh
```

Optional Dashboard smoke:

```bash
bash install/run-smoke-test.sh --dashboard
```

Expected result:

- Mother `/healthz`, `/readyz`, `/v1/policies`, `/v1/policies/default` work.
- Agent `/healthz`, `/readyz`, `/v1/policy/effective`, `/v1/policy/sync-status`, `/v1/stats`, `/v1/comparison/diagnostics` work.
- A synthetic shadow payload increments Agent stats.
- Temporary files are cleaned automatically.

## 4. Optional WordPress shadow test

Only on backup/staging WordPress:

1. Copy the PHP Gateway files you intend to test.
2. Keep PHP as source of truth.
3. Enable only shadow bridge config:

```php
'agent_shadow_enabled' => true,
'agent_shadow_endpoint' => 'http://127.0.0.1:8731/v1/shadow/decision',
'agent_shadow_timeout_ms' => 80,
'agent_shadow_log_enabled' => true,
'agent_shadow_secret' => '',
```

4. Open key pages manually.
5. Check Agent `/v1/stats` and `/v1/comparison/diagnostics`.
6. Disable shadow immediately if any issue appears.

Do not enable enforcement. R8D has no enforcement path.

## 5. Failure tests

- Stop Mother: Agent should continue using local/default or last-known-good fallback.
- Stop Agent: PHP Gateway must continue with existing behavior.
- Return invalid Mother policy: Agent must not crash and should fallback safely.
- Stop Dashboard: PHP, Agent, and Mother behavior must not change.

## 6. Pass criteria

- Staging site still loads.
- No PHP fatal or HTTP 500 is introduced.
- Agent receives shadow events.
- Stats increment after traffic.
- Dashboard shows read-only status.
- No public ports are exposed.
- Rollback plan works.
