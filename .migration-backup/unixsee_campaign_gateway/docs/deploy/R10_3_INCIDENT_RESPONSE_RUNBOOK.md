# R10.3 Incident Response Runbook

This runbook is for controlled beta staging. Do not enable enforcement, do not expose Agent, do not copy the full PHP runtime into webroot, and do not paste secrets into tickets/logs.

## 1. Dashboard inaccessible

Symptoms: dashboard URL fails, 502/503, login page unavailable.
Impact: operators cannot inspect control plane from UI; Mother/Agent may still run.
Immediate safe action: keep runtime shadow-only; check local Dashboard service and reverse proxy.
Diagnostics: `systemctl status unixsee-dashboard`, `curl -I http://127.0.0.1:8740/login`, reverse proxy logs.
Rollback: restore previous dashboard build/unit from backup.
What not to do: do not bind Dashboard publicly without HTTPS/auth.

## 2. Login broken

Symptoms: login loop, rejected password, session errors.
Impact: UI unavailable; Mother API may still be healthy.
Immediate safe action: verify `dashboard.env` and user store backup.
Diagnostics: dashboard logs, session secret configured flag, user store permissions.
Rollback: restore previous dashboard env/user store.
What not to do: do not disable auth on a public Dashboard.

## 3. Mother down

Symptoms: `/healthz` and `/readyz` fail, Dashboard cannot load data.
Impact: Agent cannot pull config or push telemetry.
Immediate safe action: keep PHP Gateway runtime as current source of truth; no enforcement change.
Diagnostics: `systemctl status unixsee-mother`, logs, storage path permissions.
Rollback: restore previous Mother binary/config/storage backup.
What not to do: do not expose temporary unauthenticated write endpoints.

## 4. Agent telemetry stale

Symptoms: `/alerts` shows telemetry stale/missing, `/agents` shows stale.
Impact: observability gap; runtime PHP decisions continue.
Immediate safe action: check local Agent service and Mother reachability.
Diagnostics: `systemctl status unixsee-agent`, `curl http://127.0.0.1:8731/healthz`, Agent logs.
Rollback: restore previous Agent binary/config.
What not to do: do not expose Agent port publicly.

## 5. PHP Gateway endpoint down

Symptoms: wrapper endpoint returns 500/404/unexpected JSON.
Impact: public Gateway endpoint unavailable.
Immediate safe action: restore wrapper or private runtime backup.
Diagnostics: PHP error logs, wrapper path, private runtime path, `php -l`.
Rollback: run wrapper/runtime rollback scripts.
What not to do: do not copy full runtime into webroot.

## 6. Public runtime exposure detected

Symptoms: validation finds private files under webroot or probes return 200.
Impact: critical security exposure.
Immediate safe action: remove exposed private files from webroot and keep only wrapper.
Diagnostics: `validate-public-exposure-hardening.sh`, web server access logs.
Rollback: restore clean wrapper-only webroot backup.
What not to do: do not leave `.env`, `.yml`, sqlite, docs, tools or full runtime public.

## 7. Storage corruption

Symptoms: storage status unhealthy, load/save errors, JSON parse failure.
Impact: Mother state/history/alerts may be unavailable.
Immediate safe action: stop Mother if writes may worsen corruption; copy current state for forensic backup.
Diagnostics: storage status endpoint, Mother logs, filesystem permissions/free disk.
Rollback: restore last known-good storage archive.
What not to do: do not edit live JSON manually without backup.

## 8. Config publish mistake

Symptoms: wrong active config/version, rollout warnings.
Impact: Agent may pull wrong shadow config; runtime PHP decisions still authoritative.
Immediate safe action: use config rollback; verify ack.
Diagnostics: config history, agent detail, rollout alerts.
Rollback: publish rollback to previous version.
What not to do: do not enable enforcement.

## 9. Rollback required

Symptoms: repeated critical alerts or failed release gates.
Impact: beta should pause.
Immediate safe action: rollback changed component only: core, dashboard, agent, wrapper, or config.
Diagnostics: release evidence, health report, systemd status.
Rollback: use R10.1/R10.3 rollback scripts and backup archives.
What not to do: do not perform destructive restore without fresh backup.

## 10. Mother management token suspected leaked

Symptoms: suspicious audit writes, token disclosed in wrong channel.
Impact: unauthorized Mother write risk.
Immediate safe action: rotate token, restart Mother/Dashboard server processes, review audit.
Diagnostics: audit trail, reverse proxy logs.
Rollback: not applicable; rotate and invalidate old token.
What not to do: do not paste old/new token into tickets.

## 11. Dashboard session secret rotated

Symptoms: active sessions invalidated.
Impact: users must log in again.
Immediate safe action: expected behavior; verify login.
Diagnostics: Dashboard logs.
Rollback: restore previous secret only if rotation was accidental and not leaked.
What not to do: do not use a short/default secret.

## 12. PostgreSQL unavailable if configured

Symptoms: postgres_unavailable alert, storage readyz fails.
Impact: Mother persistence unavailable for PostgreSQL profile.
Immediate safe action: check DB service/network/DSN; consider JSON fallback only through documented migration path.
Diagnostics: DB reachability, migrations, Mother logs.
Rollback: restore previous storage config and DB dump.
What not to do: do not claim PostgreSQL healthy without driver/runtime verification.

## 13. Reverse proxy/HTTPS broken

Symptoms: public Dashboard shows HTTP, wrong headers, cookies insecure.
Impact: public UI unsafe.
Immediate safe action: restrict access until HTTPS/auth headers are correct.
Diagnostics: `curl -I`, OLS/Nginx logs, certificate status.
Rollback: restore previous vhost/proxy config.
What not to do: do not expose local ports directly as a workaround.
