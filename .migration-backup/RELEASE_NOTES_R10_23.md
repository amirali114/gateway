# Release Notes — R10.23
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.23  
**Date:** 2026-07-05  
**Base:** R10.22 (alert actions safety QA)  
**Scope:** Safety design document for config workflow actions (GAP-03). Planning only — no code changes to dashboard, Mother, Agent, or PHP Gateway.

---

## What's New in R10.23

### 1. `docs/R10_23_CONFIG_WORKFLOW_SAFETY_PLAN.md`

A complete safety design document covering the planned implementation of validate, publish, and rollback config workflow actions. Sections include:

| Section | Coverage |
|---|---|
| Context & current state | Gateway page baseline, shadow-only mode, agent-scoped operations |
| Hard constraints | 8 invariants carried forward from alert action pattern |
| RBAC design | Permission mapping (no RBAC change needed), double-guard pattern |
| Mother API inventory | 6 available functions documented; 1 blocker identified |
| Server action architecture | Planned signatures, actor headers, validate-before-publish flow |
| Audit trail design | Event schema, note sanitization, no Mother error in audit metadata |
| Confirmation flow | Validate (single step), publish (two-step), rollback (two-step with version param) |
| Error handling | Error taxonomy, sanitized error codes per action |
| UI placement | Gateway page layout, confirm page route |
| Rollback/no-op behavior | Idempotency table, no-undo policy |
| Implementation phases | 6 ordered phases with file targets and acceptance criteria |
| Files to be changed | 1 new, 1 updated |
| Security checklist | 9 enforcement points |
| Blockers | Draft write API missing (see below) |
| Out of scope | 7 excluded features with rationale |

---

## Changed Files

| File | Change |
|---|---|
| `docs/R10_23_CONFIG_WORKFLOW_SAFETY_PLAN.md` | **New** — safety design doc |
| `RELEASE_NOTES_R10_23.md` | **New** — this file |

## Unchanged

All dashboard source code, RBAC, auth, session, Mother token handling, and Mother/Agent/PHP Gateway are unchanged from R10.22.

---

## Blockers Identified in R10.23

### BLOCKER-01 — No Mother draft-write API
`gateway.draft.write` permission exists in `lib/rbac.ts` but there is no corresponding Mother API function in `lib/api.ts` for writing a draft config from the dashboard. The `controlPlaneConfigFromForm` helper (GAP-06) is dead code with no backing endpoint.

**Impact:** Draft config editing is deferred. R10.24 will implement validate + publish + rollback only.  
**Resolution required:** A confirmed Mother endpoint (e.g. `PUT /v1/agents/:id/config/draft`) and a corresponding `lib/api.ts` function before draft-write can be planned.

---

## Implementation Phases Defined in R10.23

R10.23 documents but does not implement. The following phases are planned for R10.24:

| Phase | Task | Primary file |
|---|---|---|
| 1 | Add `validateDraftAction` server action + display | `gateway/page.tsx` |
| 2 | Add publish/rollback intent links, update banner + safety model | `gateway/page.tsx` |
| 3 | Add confirmation page | `gateway/[agent_id]/confirm/page.tsx` (new) |
| 4 | Add `publishDraftAction` + `rollbackAction` server actions | `gateway/[agent_id]/confirm/page.tsx` |
| 5 | Add ok/error searchParams display, update readonly banner text | `gateway/page.tsx` |
| 6 | Verify audit events appear in `/audit` | No code change |

---

## Build

`npm run build` — clean (no code changes; R10.22 build baseline preserved).

---

## Open Gaps

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI | Closed in R10.21, QA in R10.22 |
| GAP-02 — Alert detail page | Closed in R10.19 |
| GAP-03 — Config publish/rollback | Planned in R10.23 safety doc; implementation deferred to R10.24 |
| GAP-04 — Remove getMotherDebugDefaultPolicy | Open |
| GAP-05 — Remove getMotherReleaseGateSummary | Open |
| GAP-06 — Remove controlPlaneConfigFromForm | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
