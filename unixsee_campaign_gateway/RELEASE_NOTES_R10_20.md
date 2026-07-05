# Release Notes — R10.20
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.20  
**Date:** 2026-07-04  
**Base:** R10.19 (GAP-02 alert detail page)  
**Scope:** Safety design document for alert management actions (GAP-01). Planning only — no code changes to dashboard, Mother, Agent, or PHP Gateway.

---

## What's New in R10.20

### 1. `docs/R10_20_ALERT_MANAGEMENT_SAFETY_PLAN.md`

A complete safety design document covering the planned implementation of resolve, mute, and unmute alert actions. Sections include:

| Section | Coverage |
|---|---|
| Context & constraints | Current state, hard invariants that must not change |
| RBAC design | Permission mapping, double-guard pattern, role assignments |
| Server action architecture | Why server actions, planned signatures, actor headers |
| Audit trail design | Event schema, failure recording, audit page integration |
| Confirmation flow | Two-step form pattern, confirmation page route, unmute exception |
| Error handling | Error taxonomy, display pattern, Mother error sanitization |
| UI placement & visibility | Detail page card, list page policy, confirmation page access |
| Rollback / no-op behavior | Mother idempotency, no cascade, no bulk actions |
| Implementation phases | 7 ordered phases with file targets and acceptance criteria |
| Security checklist | 8 enforcement points mapped to code locations |
| Files to be changed | Exact file list: 1 new, 2 updated, nothing else |
| Out of scope | Explicit exclusion list with rationale |

---

## Changed Files

| File | Change |
|---|---|
| `docs/R10_20_ALERT_MANAGEMENT_SAFETY_PLAN.md` | **New** — safety design doc |
| `RELEASE_NOTES_R10_20.md` | **New** — this file |

## Unchanged

All dashboard source code, auth, session, RBAC, user-store, Mother token handling, and Mother/Agent/PHP Gateway are unchanged from R10.19.

---

## Implementation Phases Defined in R10.20

R10.20 documents but does not implement. The following phases are planned for R10.21:

| Phase | Task | Primary file |
|---|---|---|
| 1 | Confirm `alerts.manage` on `operator` role | `lib/rbac.ts` |
| 2 | Add 3 server actions with RBAC + audit + Mother call | `alerts/[alert_id]/page.tsx` |
| 3 | Add management UI card (conditional on permission) | `alerts/[alert_id]/page.tsx` |
| 4 | Add confirmation page | `alerts/[alert_id]/confirm/page.tsx` (new) |
| 5 | Add ok/error searchParams display to detail page | `alerts/[alert_id]/page.tsx` |
| 6 | Wire unmute direct (no confirm step) | `alerts/[alert_id]/page.tsx` |
| 7 | Verify audit trail entries in `/audit` | No code change |

---

## Build

`npm run build` — clean (no code changes; R10.19 build baseline preserved).

---

## Open Gaps

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI | Planned in R10.20 safety doc; implementation deferred to R10.21 |
| GAP-02 — Alert detail page | Closed in R10.19 |
| GAP-03 — Config publish/rollback | Open |
| GAP-04 — Remove getMotherDebugDefaultPolicy | Open |
| GAP-05 — Remove getMotherReleaseGateSummary | Open |
| GAP-06 — Remove controlPlaneConfigFromForm | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
