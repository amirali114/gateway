# Release Notes — R10.24
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.24  
**Date:** 2026-07-05  
**Base:** R10.23 (config workflow safety plan)  
**Scope:** Implement validate, publish, and rollback config workflow actions on /gateway.

---

## What's New in R10.24

### Config Workflow Actions on /gateway

Three server-side config actions are now live on the `/gateway` page for users with the appropriate permissions. All actions are shadow-only — they update what Mother has stored for the selected agent; they do not change live PHP Gateway traffic or enforcement.

| Action | Permission | Trigger | Confirm page |
|---|---|---|---|
| Validate draft | `gateway.config.validate` | Form button on /gateway | No — result shown inline |
| Publish draft | `gateway.config.publish` | Intent link → /gateway/[id]/confirm | Yes |
| Rollback to version | `gateway.config.rollback` | Per-row link in version history → /gateway/[id]/confirm | Yes |

---

## Changed Files

| File | Change |
|---|---|
| `lib/rbac.ts` | Added 3 new permissions; assigned to owner + admin |
| `lib/api.ts` | Added optional `actorHeaders` param to `validateMotherAgentConfig`, `publishMotherAgentConfig`, `rollbackMotherAgentConfig` |
| `app/(dashboard)/gateway/page.tsx` | Added validate action, config workflow card, rollback links, conditional banner + safety model, searchParams result display |
| `app/(dashboard)/gateway/[agent_id]/confirm/page.tsx` | **New** — publish and rollback confirmation page with server actions |
| `RELEASE_NOTES_R10_24.md` | **New** — this file |

---

## RBAC Changes

**Yes — strictly required.** The task mandates `gateway.config.validate`, `gateway.config.publish`, and `gateway.config.rollback` as server action permission names. These did not exist in `lib/rbac.ts` and had to be added.

| Permission | Assigned to | Not assigned to |
|---|---|---|
| `gateway.config.validate` | owner, admin | operator, viewer |
| `gateway.config.publish` | owner, admin | operator, viewer |
| `gateway.config.rollback` | owner, admin | operator, viewer |

Existing `gateway.publish` and `gateway.rollback` permissions are unchanged. Operator retains `gateway.draft.write` but has no publish/rollback/validate access (same as before).

---

## Draft Write Added?

**No.** Draft editing is still deferred. No draft write server action or form was added. BLOCKER-01 from R10.23 remains open.

---

## Browser-Side Mother Fetch Added?

**No.** All three new server actions are `"use server"` functions. The Mother token is injected exclusively through `postMotherJson` on the server. No `fetch()` to Mother exists in any client component.

---

## Audit Events Implemented?

**Yes.** All three actions emit an audit event on both success and failure:

| Action | Audit `action` string | On success | On failure |
|---|---|---|---|
| Validate | `config.validate` | `result: "success"`, `validation_valid: true` | `result: "failure"`, error code |
| Publish | `config.publish` | `result: "success"`, `mother_status`, `note` | `result: "failure"`, `mother_status` |
| Rollback | `config.rollback` | `result: "success"`, `mother_status`, `target_version`, `note` | `result: "failure"`, `mother_status`/error |

Actor identity (`actor_user_id`, `actor_username`, `actor_role`) comes from `requirePermission()` inside each action — never from the form body.

---

## Security Properties

| Property | Status |
|---|---|
| Permission checked inside server action (not only at page load) | ✅ All three actions |
| Mother token never in browser | ✅ `postMotherJson` is server-only |
| Actor from session, not formData | ✅ `motherActorHeaders(a)` built from `requirePermission` return |
| `agent_id` from hidden server-rendered field | ✅ |
| `target_version` validated as positive integer before use | ✅ Guards in page + rollback action |
| `note` truncated to 240 chars before Mother and audit | ✅ |
| No raw Mother error in browser | ✅ Sanitized codes only |
| Publish and rollback require confirmation page | ✅ |
| Validate is direct (no confirm needed — no state change) | ✅ |

---

## Routes Added

| Route | Purpose |
|---|---|
| `/gateway/[agent_id]/confirm?action=publish` | Publish confirmation page |
| `/gateway/[agent_id]/confirm?action=rollback&version=N` | Rollback confirmation page |

**Total routes: 20** (was 19 in R10.23).

---

## Build

`npm run build` — clean. 20 dynamic routes. 0 TypeScript errors.

---

## Open Gaps

| Gap | Status |
|---|---|
| GAP-01 — Alert management UI | Closed in R10.21, QA in R10.22 |
| GAP-02 — Alert detail page | Closed in R10.19 |
| GAP-03 — Config publish/rollback | **Closed in R10.24** |
| GAP-04 — Remove getMotherDebugDefaultPolicy | Open |
| GAP-05 — Remove getMotherReleaseGateSummary | Open |
| GAP-06 — Remove controlPlaneConfigFromForm | Open |
| GAP-07 — Remove redundant draft/active config endpoints | Open |
| BLOCKER-01 — Draft write (no Mother API) | Still blocked |
