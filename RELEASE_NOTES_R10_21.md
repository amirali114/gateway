# Release Notes — R10.21
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.21  
**Date:** 2026-07-05  
**Base:** R10.20 (alert management safety plan)  
**Scope:** Implementation of resolve, mute, and unmute alert management actions (GAP-01).

---

## What's New in R10.21

### Alert management actions (GAP-01 — closed)

Three alert management actions are now available to users with the `alerts.manage` permission:

| Action | Confirmation | Server action location |
|---|---|---|
| Resolve | Required (confirm page) | `alerts/[alert_id]/confirm/page.tsx` |
| Mute | Required (confirm page) | `alerts/[alert_id]/confirm/page.tsx` |
| Unmute | Immediate (no confirm) | `alerts/[alert_id]/page.tsx` |

#### RBAC
`alerts.manage` was already present for `owner` and `admin` roles. **No RBAC change was made.**  
`operator` and `viewer` roles do not have `alerts.manage` and see no management card.

#### Browser-side Mother fetch
**Zero.** All three actions are `"use server"` functions that run server-side only.  
The browser submits a form; the server action calls Mother and redirects back.

#### Audit events
Every attempted action — success or failure — appends an `AuditEvent` via `appendAudit()`:

| Field | Value |
|---|---|
| `action` | `alert.resolve` / `alert.mute` / `alert.unmute` |
| `target_type` | `alert` |
| `target_id` | The alert ID |
| `result` | `success` or `failure` |
| `actor_user_id` | From server-side session |
| `actor_username` | From server-side session |
| `actor_role` | From server-side session |
| `metadata.mother_status` | HTTP status from Mother response |

Events appear in `/audit` automatically.

#### Double-guard pattern
`requirePermission("alerts.manage")` is called **inside every server action** — not only at page load. Even if a user navigates directly to the confirm page URL, the server action re-verifies permission before calling Mother.

#### Error handling
- Mother API failures: audit failure logged; browser receives only a sanitized error code (`resolve_failed`, `mute_failed`, `unmute_failed`). No raw Mother error detail is forwarded.
- Missing alert ID in form body: audit failure logged; redirect to `/alerts?error=missing_alert_id`.
- Actor identity is sourced from the server-side session — it cannot be forged via the form body.

---

## Changed Files

| File | Change |
|---|---|
| `app/(dashboard)/alerts/[alert_id]/page.tsx` | Updated — adds `unmuteAlertAction` server action, management card (conditional on `alerts.manage`), `searchParams` ok/error display, updated readonly-banner, updated safety model card |
| `app/(dashboard)/alerts/[alert_id]/confirm/page.tsx` | **New** — confirmation page with `confirmResolveAction` and `confirmMuteAction` server actions |
| `RELEASE_NOTES_R10_21.md` | **New** — this file |

## Unchanged

`lib/api.ts`, `lib/auth.ts`, `lib/rbac.ts`, `lib/user-store.ts`, `middleware.ts`,  
`app/(dashboard)/alerts/page.tsx` (list), Mother, Agent, PHP Gateway.

---

## Build

`npm run build` — clean. 19 dynamic routes (was 18 — new confirm route added).

---

## Open Gaps

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI | **Closed in R10.21** |
| GAP-02 — Alert detail page | Closed in R10.19 |
| GAP-03 — Config publish/rollback | Open |
| GAP-04 — Remove getMotherDebugDefaultPolicy | Open |
| GAP-05 — Remove getMotherReleaseGateSummary | Open |
| GAP-06 — Remove controlPlaneConfigFromForm | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
