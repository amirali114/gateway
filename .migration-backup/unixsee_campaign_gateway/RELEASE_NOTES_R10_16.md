# Release Notes — R10.16 Mother + Agent Product Surface

**Release:** R10.16  
**Date:** 2026-07-04  
**Scope:** UI / product surface — dashboard only. No auth, RBAC, API, or runtime changes.

---

## Summary

R10.16 adds dedicated product-surface sections across six dashboard pages:
`/agents`, `/agents/[agent_id]`, `/mother`, `/diagnostics`, `/policy`, `/release`.

All changes are read-only, server-side rendered, English LTR. No browser-direct Mother calls.
No enforcement, rollback, or remote command surfaces were added.

---

## Changes by page

### /agents
- **Telemetry freshness breakdown** — new `SectionCard` shows fresh / stale / missing counts
  with percentage distribution and links to stale agents when `stale_agent_ids` is present.
- **Policy sync state** — new `SectionCard` shows config sync posture (in-sync / pending / stale)
  from existing agent registry data; includes `configs_pending_delivery` from diagnostics summary.
- **Connect / install guidance** — when the registry is empty, replaces bare `EmptyState` with a
  four-step numbered checklist covering agent binary install, Mother endpoint config, systemd
  service start, and first policy pull.

### /agents/[agent_id]
- **Agent unavailable state** — early return when `detailResult.ok` is false: renders a proper
  error card with context links and guidance; raw error payload in `RawJsonDrawer`.
- **Stale / unknown posture banner** — `readonly-banner` when agent status is `stale` or `unknown`,
  explaining the state without offering any action.
- **Telemetry posture card** — dedicated two-column section showing freshness status, last push
  timestamp, remote address, stale threshold, and received/mismatched counts.
- **Config sync posture card** — delivered-at, acknowledged version, ack timestamp, and a
  degraded-state notice when sync status is `stale` or `error`.

### /mother
- **Mother Core status section** — two-column `kv` table showing service name, mode, policy source,
  policy status, storage engine, and storage posture from the health + ready endpoints.
- **Storage status section** — full `kv` table from `/v1/storage/status`: engine, writable flag,
  last load/save, DB connected, schema version, migration status, last query, last error.
  Persisted object counts rendered as a `DataTable` when present.
  Graceful fallback to `ready.storage_engine` when the storage endpoint is unavailable.
- **Hero storage pill** — hero stats now shows `StatusPill` for storage posture instead of raw text.
- Added `getMotherStorageStatus` to the page's `Promise.all` fetch set.

### /diagnostics
- **Alert posture section** — renamed from "Alert summary"; adds alert scope breakdown table
  from `alerts.by_scope` and a most-recent-alerts table from `alerts.latest`.
- **Config rollout posture section** — new `pulse-grid` showing published / pending / acknowledged /
  stale config counts from `MotherDiagnosticsSummary`; includes rollback count; shown only when
  rollout data is present.

### /policy
- **Policy sync state section** — new `SectionCard` with two-column `kv` table:
  default policy metadata, policy source from `/readyz`, `policy_status`, configs pending/stale
  from diagnostics summary, and computed rollout posture pill.
  Inline `readonly-banner` when pending or stale configs are detected.
- Added `getMotherReady` and `getMotherDiagnosticsSummary` to the page's fetch set.
- Hero stats sync status now shows full `policyStatus` label instead of `active`/`unknown` binary.

### /release
- **Release gate posture section** — new `SectionCard` using existing `ReleaseSummaryStrip`
  component plus a six-item checklist: backup/restore, shadow-only safety, public exposure,
  telemetry freshness, recent critical events, and active alert count.  
  `generated_at` timestamp shown when present.
- Added `getMotherDiagnosticsSummary` to the page's fetch set for telemetry freshness signal.

---

## Rules upheld
- English + LTR only. No Persian text.
- No deploy, rollback, or enforcement action surfaces.
- Raw JSON only inside `RawJsonDrawer` / collapse; never rendered as formatted prose.
- Browser never fetches Mother directly; all data flows via server components.
- Auth (`requirePermission`) and RBAC unchanged.
- No new API endpoint functions added to `lib/api.ts`.

---

## Build
```
cd unixsee_campaign_gateway/dashboard
npm ci
npm run build
```
