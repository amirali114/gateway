# Release Notes — R10.22
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.22  
**Date:** 2026-07-05  
**Base:** R10.21 (alert management actions)  
**Scope:** Safety QA audit of alert management actions. No new features. No UI redesign. No backend changes.

---

## What's New in R10.22

### Safety QA — alert management actions

Full audit of resolve, mute, and unmute alert actions implemented in R10.21.

---

## QA Findings

### Check 1 — Server actions only
**Pass.** All three write operations use `"use server"`:
- `unmuteAlertAction` in `alerts/[alert_id]/page.tsx`
- `confirmResolveAction` in `alerts/[alert_id]/confirm/page.tsx`
- `confirmMuteAction` in `alerts/[alert_id]/confirm/page.tsx`

No route handlers, no client-side fetch, no API endpoints added.

### Check 2 — `requirePermission("alerts.manage")` inside every action
**Pass.** Each server action re-calls `requirePermission("alerts.manage")` at its own top, independently of the page-level check. The permission guard is not bypassed by navigating directly to the confirm page URL.

### Check 3 — No browser-side Mother fetch
**Pass.** `lib/api.ts` begins with `import "server-only"` which prevents any import into client code. All three Mother calls (`resolveMotherAlert`, `muteMotherAlert`, `unmuteMotherAlert`) are inside `"use server"` functions and cannot be reached from the browser.

### Check 4 — No Mother token exposure
**Pass.** The `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` is only read inside `postMotherJson` in `lib/api.ts` (server-only). It is never passed to `actorHeaders`, never rendered, never included in redirects or responses. `motherActorHeaders(auth)` builds actor identity headers from the session — no token.

### Check 5 — Audit event on success and failure
**Pass.** All three actions audit:
- On empty/missing `alert_id` form field: `result: "failure"`, `metadata.error: "missing_alert_id"`
- On Mother API rejection (`!result.ok`): `result: "failure"`, `metadata.mother_status: result.status`
- On Mother API success: `result: "success"`, `metadata.mother_status: result.status`

Every path through every action produces exactly one audit event before redirecting.

### Check 6 — Sanitized error redirects only
**Pass.** Server actions redirect with predefined codes only:
- `?error=missing_alert_id`
- `?error=resolve_failed`
- `?error=mute_failed`
- `?error=unmute_failed`

No raw Mother error strings, no stack traces, no internal field values forwarded to the browser. Mother error strings are already sanitized in `safeErrorMessage()` (220-char limit, stack trace stripped), but the server actions use even coarser codes to avoid forwarding any Mother internals.

### Check 7 — Confirm page for resolve and mute
**Pass.** `alerts/[alert_id]/confirm/page.tsx`:
- Calls `requirePermission("alerts.manage")` at page load — redirects to `/login` or throws on insufficient permission
- Validates `action` param: `if (action !== "resolve" && action !== "mute") redirect(...)` — invalid or missing action silently redirects to the detail page with no error message
- Re-fetches the alert from Mother live at confirm page load time (not cached from the detail page)
- Both resolve and mute have separate server actions, each with their own `requirePermission` guard

### Check 8 — Unmute remains permission-checked
**Pass.** `unmuteAlertAction` calls `requirePermission("alerts.manage")` at line 54 — inside the action body. The action cannot execute without a valid session and the required permission. The unmute form is also only rendered when `canManage` is `true` at the page level (double gate).

### Check 9 — Alert detail viewable with `alerts.view` only
**Pass.** `alerts/[alert_id]/page.tsx` calls `requirePermission("alerts.view")` — a user with only `alerts.view` can load the page and see all alert data. The `canManage` flag determines only whether the management card is rendered. Users without `alerts.manage` who navigate to `/alerts/[id]/confirm` are blocked by `requirePermission("alerts.manage")` on that page.

### Check 10 — Users without `alerts.manage` cannot see management UI
**Pass.** The management card is wrapped in `{canManage && (...)}`. The unmute form is inside the same card. Resolve and mute links are inside the same card. A user without `alerts.manage` sees no management controls, no action links, and no unmute form.

---

## Fix Applied

### QA-FIX-01 — Sanitize `?ok=` query param before display (low severity)

**File:** `app/(dashboard)/alerts/[alert_id]/page.tsx`

**Before:** `sp.ok` was rendered directly in the notice banner. A crafted URL `?ok=<arbitrary text>` would display arbitrary text in the banner (no XSS risk — React escapes HTML, but incorrect UX).

**After:** A `KNOWN_OK` set (`"resolved"`, `"muted"`, `"unmuted"`) is checked before rendering. Unknown or absent values produce `safeOk = null` and suppress the banner. Only server-action-produced values can display in the notice.

**Lines changed:** 2 lines added, 1 reference updated. No logic path change for valid flows.

---

## Changed Files

| File | Change |
|---|---|
| `app/(dashboard)/alerts/[alert_id]/page.tsx` | QA-FIX-01: `KNOWN_OK` set + `safeOk` guard before notice banner |
| `RELEASE_NOTES_R10_22.md` | **New** — this file |

## Unchanged

`app/(dashboard)/alerts/[alert_id]/confirm/page.tsx`, `lib/rbac.ts`, `lib/api.ts`, `lib/auth.ts`, `lib/user-store.ts`, `middleware.ts`, `app/(dashboard)/alerts/page.tsx`, Mother, Agent, PHP Gateway.

---

## RBAC / Backend / API Logic Changed?
**No.** No RBAC change. No backend change. No new API endpoints. No new Mother calls.

---

## Build

`npm run build` — clean. 19 dynamic routes. 0 TypeScript errors. Route count unchanged from R10.21.

---

## Open Gaps

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI | Closed in R10.21, QA passed in R10.22 |
| GAP-02 — Alert detail page | Closed in R10.19 |
| GAP-03 — Config publish/rollback | Open |
| GAP-04 — Remove getMotherDebugDefaultPolicy | Open |
| GAP-05 — Remove getMotherReleaseGateSummary | Open |
| GAP-06 — Remove controlPlaneConfigFromForm | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
