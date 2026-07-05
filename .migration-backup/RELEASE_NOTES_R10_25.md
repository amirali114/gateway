# Release Notes — R10.25
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.25  
**Date:** 2026-07-05  
**Base:** R10.24 (config workflow actions)  
**Scope:** Safety QA audit of config workflow actions — validate, publish, rollback.

---

## What's New in R10.25

Safety QA audit of the config workflow actions implemented in R10.24. 10 checks passed without change. 1 code-quality fix applied.

---

## Changed Files

| File | Change |
|---|---|
| `app/(dashboard)/gateway/page.tsx` | QA-FIX-01: removed runtime string replacement from readonly-banner text |
| `RELEASE_NOTES_R10_25.md` | **New** — this file |

---

## Issues Found / Fixed

### QA-FIX-01 — Banner text used runtime string replacement (low — code quality)

**File:** `app/(dashboard)/gateway/page.tsx` lines 102–119  
**Finding:** `bannerText` was constructed as a full sentence starting with "PHP Gateway is the runtime source of truth." Then at render time, `.replace("PHP Gateway is the runtime source of truth. ", "")` stripped that prefix so only the conditional suffix would follow the bold lead text in the JSX. If either branch of `bannerText` ever drifted — for example if the prefix changed spelling or punctuation — the `.replace()` would silently fail and render the full doubled sentence (once bold, once plain).  
**Fix:** Renamed to `bannerSuffix`, containing only the conditional part (after the bold phrase). Rendered directly as `{bannerSuffix}`. No runtime string manipulation.  
**Severity:** Low — no security impact. No incorrect behaviour in R10.24 since prefix matched exactly. Fixed as defensive code quality measure.

---

## Full QA Check Results (10 checks)

| Check | Result | Notes |
|---|---|---|
| 1. Server actions only | **Pass** | `validateDraftAction`, `confirmPublishAction`, `confirmRollbackAction` all begin with `"use server"` |
| 2. `requirePermission()` inside every action | **Pass** | Each action calls `requirePermission` as its first statement, independent of page-level auth |
| 3. No browser-side Mother fetch | **Pass** | `lib/api.ts` has `import "server-only"` at line 1; build fails if imported client-side |
| 4. No Mother token exposure | **Pass** | Token only in `postMotherJson` via `process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN` — never in response or redirect |
| 5. Audit event on success and failure | **Pass** | All branches covered: missing agent, fetch failure, Mother rejection, success — each logs `appendAudit` before redirecting |
| 6. Sanitized success/error redirects | **Pass** | KNOWN\_VALIDATE\_OK, KNOWN\_VALIDATE\_ERROR, KNOWN\_OK, KNOWN\_ERROR sets gate display; no raw codes reach UI |
| 7. Publish + rollback require confirmation | **Pass** | Both are intent links → `/gateway/[agent_id]/confirm` with live re-fetch; no direct form submission |
| 8. Validate is permission-checked | **Pass** | `requirePermission("gateway.config.validate")` is the first call in `validateDraftAction` |
| 9. `/gateway` viewable with `gateway.view` only | **Pass** | `requirePermission("gateway.view")` at page load; config workflow card conditional on `hasAnyConfigWrite`; read-only users see standard view |
| 10. Users without `gateway.config.*` cannot see workflow controls | **Pass** | `canValidate`, `canPublish`, `canRollback` guard each element; `hasAnyConfigWrite` gates entire workflow SectionCard |
| 11. No draft write/edit UI | **Pass** | No draft write form, input, button, or dead code anywhere in gateway or confirm pages |
| 12. No raw Mother error details in browser | **Pass** | Write-action errors audited and redirected with sanitized code; GET-fetch errors in `ErrorState` follow existing dashboard pattern |

---

## RBAC / Backend / API Logic Changed?

**No.** Zero changes to `lib/rbac.ts`, `lib/api.ts`, `lib/auth.ts`, `lib/user-store.ts`, `middleware.ts`, or any Mother/Agent/PHP Gateway. The single fix is rendering logic only.

---

## Build

`npm run build` — clean. 20 dynamic routes. 0 TypeScript errors. Unchanged from R10.24.
