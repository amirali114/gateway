# Release Notes — R10.19
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.19  
**Date:** 2026-07-04  
**Base:** R10.18 (audit-only snapshot of R10.17 source)  
**Scope:** GAP-02 — Read-only Alert Detail page (`/alerts/[alert_id]`).

---

## What's New in R10.19

### 1. `/alerts/[alert_id]` — Read-Only Alert Detail Page

Closes GAP-02 from the R10.18 function/data-integration audit.

**Route:** `app/(dashboard)/alerts/[alert_id]/page.tsx`  
**Permission guard:** `alerts.view` (same as the alerts list — no new permission required)  
**Mother API function used:** `getMotherAlert(alertId)` — `GET /v1/alerts/:id`  
**Write/action code added:** None.

**Page sections:**

| Section | Content |
|---|---|
| Hero panel | Severity pill, status pill, message summary, scope / agent / occurrence count / management actions (None) |
| Identity | Alert ID, fingerprint, type, scope, agent (linked to `/agents/:id` if present) |
| Severity & status | Severity pill, status pill, occurrence count |
| Message | Title and full message text |
| Timeline | First seen, last seen, created timestamp, last updated, resolved at (if present) |
| Evidence & context | All `metadata` fields as a key-value table; nested objects rendered in a RawJsonDrawer |
| Safety model | Checklist confirming read-only posture |
| Raw payload | Full `alertResult` in collapsible RawJsonDrawer |

**Not-found / error state:** When Mother cannot return the alert (expired, bad ID, unreachable), a structured error state is rendered with guidance linking back to `/alerts` and `/diagnostics`.

### 2. Alerts List — Detail Links

`/alerts` active-alert table rows now include a **Detail** link column pointing to `/alerts/[alert_id]` for any alert that carries a non-empty `id` field. Alerts without a stable `id` remain unlinked (fingerprint-only alerts cannot be fetched individually from Mother's single-alert endpoint).

---

## Changed Files

| File | Change |
|---|---|
| `app/(dashboard)/alerts/[alert_id]/page.tsx` | **New** — read-only alert detail page |
| `app/(dashboard)/alerts/page.tsx` | Updated — added Detail link column to active-alert table |
| `RELEASE_NOTES_R10_19.md` | **New** — this file |

## Unchanged

All auth, session, RBAC, user-store, and Mother token handling is unchanged. No write functions were called or exposed. No new permissions were added. No mock data was introduced.

---

## Safety Posture Confirmation

| Property | Status |
|---|---|
| Read-only — no write/action code added | ✅ Confirmed |
| Mother API called server-side only | ✅ Confirmed |
| Management token never delivered to browser | ✅ Confirmed |
| Page gated by `requirePermission("alerts.view")` | ✅ Confirmed |
| No resolve / mute / unmute / acknowledge controls | ✅ Confirmed |
| No mock or placeholder data | ✅ Confirmed |
| `export const dynamic = "force-dynamic"` | ✅ Confirmed |

---

## Build

`npm run build` — clean. 18 dynamic routes (was 17 in R10.18). 0 TypeScript errors.

---

## Remaining Open Gaps (from R10.18 audit)

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI (resolve/mute/unmute) | Open — intentionally deferred |
| GAP-02 — Alert detail page | **Closed in R10.19** |
| GAP-03 — Config publish/rollback workflow | Open |
| GAP-04 — Remove `getMotherDebugDefaultPolicy` dead probe | Open |
| GAP-05 — Remove `getMotherReleaseGateSummary` unused endpoint | Open |
| GAP-06 — Remove `controlPlaneConfigFromForm` dead utility | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
