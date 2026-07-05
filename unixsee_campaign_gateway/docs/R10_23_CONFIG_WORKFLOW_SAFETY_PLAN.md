# R10.23 Config Workflow Safety Plan
**Project:** Unixsee Campaign Gateway Dashboard  
**Document type:** Safety design — implementation planning only. No code changes.  
**Base release:** R10.22  
**Date:** 2026-07-05  
**Scope:** Validate, publish, and rollback agent configuration — safety architecture, RBAC, audit trail, server action design, confirmation flow, error handling.

---

## 1. Context and Current State

### 1.1 Current gateway page (R10.22 baseline)
The `/gateway` page is entirely read-only. It displays:
- Active config and draft config (from `getMotherAgentConfig`)
- Diff between active and draft (from `getMotherAgentConfigDiff`)
- Config version history (from `getMotherAgentConfigVersions`)

The page header explicitly states: *"Write, publish, and rollback actions are not exposed in this dashboard."*

The `readonly-banner` reads: *"No write, publish, or rollback action exists here."*

The safety model card states: *"No write, publish, or rollback action is exposed in this dashboard."*

All three statements must be updated when actions are implemented. The update must be conditional: operators with only `gateway.view` should still see a read-only banner; operators with `gateway.publish` or `gateway.rollback` should see accurate information about what actions are available to them.

### 1.2 Agent-scoped operations
All config actions are scoped to a specific `agent_id`. There are no fleet-wide config write operations. Every server action receives an `agent_id` from a hidden form field (server-rendered from the selected agent's ID, not from an editable input). `encodeURIComponent` is applied before passing to Mother.

### 1.3 Shadow-only mode
Agents operate in shadow-only mode — they compare and report but do not enforce traffic decisions. The PHP Gateway remains the runtime source of truth. Publishing a config to Mother is not a live traffic change; it changes what agents observe and compare. This must be communicated clearly in the confirmation UI.

---

## 2. Hard Constraints (Unchanged Throughout Implementation)

| Constraint | Rationale |
|---|---|
| Mother management token never leaves the server | Security. `postMotherJson` already enforces this. |
| Browser must never call Mother directly | Architecture. All config write calls in `"use server"` functions. |
| No change to Mother, Agent, or PHP Gateway | Scope boundary. |
| No change to auth, session, RBAC, token, or storage logic | Stability. |
| All write actions gated by the appropriate permission inside the server action | Double-guard pattern (same as alert actions). |
| Every action appended to audit trail, success and failure | Accountability. |
| No silent failures — operator sees success or explicit error | UX + safety. |
| `agent_id` always sourced from server-rendered hidden field, not user input | Prevents agent ID forgery from the form body. |

---

## 3. RBAC Design

### 3.1 Permission assignments (current state — no change needed)

| Role | `gateway.view` | `gateway.draft.write` | `gateway.publish` | `gateway.rollback` |
|---|---|---|---|---|
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `operator` | ✅ | ✅ | ❌ | ❌ |
| `viewer` | ✅ | ❌ | ❌ | ❌ |

> **No RBAC change is needed.** All three write permissions are already declared in `lib/rbac.ts`. `operator` can write drafts but cannot publish or rollback. `admin` and `owner` can do all three.

### 3.2 Double-guard pattern
Each server action calls its required permission at its own top, independent of the page-level `requirePermission("gateway.view")`:
```
page load → requirePermission("gateway.view")
validate action → requirePermission("gateway.publish")  [validate is pre-publish, same gate]
publish action → requirePermission("gateway.publish")
rollback action → requirePermission("gateway.rollback")
```

### 3.3 Validate gate
Validate (`validateMotherAgentConfig`) is a POST to Mother. Even though it is read-like (no state change in Mother), it uses the management token and is a write endpoint. It is gated by `gateway.publish` — the same permission as publish, since it is a prerequisite step for publish.

---

## 4. Mother API Inventory

### 4.1 Available functions (existing in `lib/api.ts`)

| Function | Method | Path | Use |
|---|---|---|---|
| `getMotherAgentConfig(agentId)` | GET | `/v1/agents/:id/config` | Fetch active + draft config |
| `getMotherAgentConfigDiff(agentId)` | GET | `/v1/agents/:id/config/diff` | Check if draft differs from active |
| `getMotherAgentConfigVersions(agentId)` | GET | `/v1/agents/:id/config/versions` | Version history for rollback selection |
| `validateMotherAgentConfig(agentId, config)` | POST | `/v1/agents/:id/config/validate` | Validate a config object |
| `publishMotherAgentConfig(agentId, note)` | POST | `/v1/agents/:id/config/publish` | Publish current draft |
| `rollbackMotherAgentConfig(agentId, targetVersion, note)` | POST | `/v1/agents/:id/config/rollback` | Rollback to a specific version |

All POST functions use `postMotherJson` which injects the management token server-side.

### 4.2 Blockers — missing Mother API

| Operation | Status | Notes |
|---|---|---|
| Validate current draft | ✅ Available | `validateMotherAgentConfig(agentId, config)` — requires passing the config object |
| Publish current draft | ✅ Available | `publishMotherAgentConfig(agentId, note)` — publishes whatever is currently in draft |
| Rollback to version | ✅ Available | `rollbackMotherAgentConfig(agentId, targetVersion, note)` |
| **Write / edit draft config** | ❌ **BLOCKER** | No `writeDraftConfig` or `patchDraftConfig` in `lib/api.ts`. No PUT/PATCH endpoint for draft config is exposed. |

**BLOCKER — Draft write:** The `gateway.draft.write` permission exists but no Mother API endpoint for writing a draft config from the dashboard is implemented or exposed in `lib/api.ts`. The `controlPlaneConfigFromForm(formData)` function (GAP-06) is dead code that builds a config object from form fields, but there is no corresponding API call to save it. **Draft editing is out of scope for R10.24 until a Mother draft-write endpoint is confirmed.**

**Implication for R10.24:** The implementation phases below cover validate, publish, and rollback only. Draft write is deferred pending Mother API confirmation.

---

## 5. Server Action Architecture

### 5.1 Why server actions (not route handlers)
Identical reasoning to alert actions (R10.21): server actions are co-located with the page, require no separate API route to secure, integrate with Next.js form model, and run exclusively server-side.

### 5.2 Planned action signatures

```typescript
// Validate current draft before publishing
async function validateDraftAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("gateway.publish");
  const agentId = String(formData.get("agent_id") || "").trim();
  const config = /* fetch current draft from Mother, pass to validate */;
  const result = await validateMotherAgentConfig(agentId, config);
  // audit + redirect with ?validate_ok=1 or ?validate_error=...
}

// Publish current draft
async function publishDraftAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("gateway.publish");
  const agentId = String(formData.get("agent_id") || "").trim();
  const note = String(formData.get("note") || "").trim().slice(0, 240);
  const result = await publishMotherAgentConfig(agentId, note);
  // audit + redirect
}

// Rollback to a specific version
async function rollbackAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("gateway.rollback");
  const agentId = String(formData.get("agent_id") || "").trim();
  const targetVersion = Number(formData.get("target_version") || 0);
  const note = String(formData.get("note") || "").trim().slice(0, 240);
  if (!targetVersion || targetVersion < 1) { /* audit failure + redirect */ }
  const result = await rollbackMotherAgentConfig(agentId, targetVersion, note);
  // audit + redirect
}
```

### 5.3 Actor headers
Same pattern as alert actions: `motherActorHeaders(auth)` from `lib/auth.ts` builds headers from the server-side session. Actor identity is never read from the form body.

### 5.4 Validate-before-publish flow
The planned sequence for publish:

1. Operator clicks "Validate draft" → `validateDraftAction` runs:
   - Fetches current draft config from Mother (server-side, via `getMotherAgentConfigDraft`)
   - Calls `validateMotherAgentConfig(agentId, draft.config)` 
   - On success: redirect to `?agent_id=...&validate_ok=1` (page re-renders, shows validation result)
   - On failure: redirect to `?agent_id=...&validate_error=invalid_config`
2. Operator clicks "Publish" (only after seeing validation result) → navigates to confirm page
3. Confirm page: operator confirms → `publishDraftAction` fires → audit + redirect

This is two separate steps (validate, then publish-confirm), not a single atomic operation. The dashboard does not enforce "validate before publish" as a technical requirement — Mother validates on its side too. The validation step is advisory UX only.

---

## 6. Audit Trail Design

### 6.1 Audit event schema

| Field | Value |
|---|---|
| `action` | `config.validate` / `config.publish` / `config.rollback` |
| `actor_user_id` | From server-side session |
| `actor_username` | From server-side session |
| `actor_role` | From server-side session |
| `target_type` | `"agent_config"` |
| `target_id` | `agentId` |
| `result` | `"success"` or `"failure"` |
| `metadata.mother_status` | HTTP status from Mother response |
| `metadata.note` | Sanitized operator note (first 240 chars) |
| `metadata.target_version` | (rollback only) Version number being rolled back to |
| `metadata.validation_valid` | (validate only) Boolean from Mother's validation response |

### 6.2 Note field sanitization
The `note` field is operator-supplied plain text. Before passing to Mother and before storing in the audit trail:
- Trim whitespace
- Slice to 240 characters
- Do not HTML-escape (used server-side only)

### 6.3 No Mother error details in audit metadata
`metadata.mother_status` stores the HTTP status code (integer) only. The Mother error string is not stored in audit metadata — same policy as alert actions.

---

## 7. Confirmation Flow Design

### 7.1 Publish — two-step, requires confirmation
Risk: publishes a new config version to Mother. Not a live traffic change (shadow-only), but irreversible without a rollback. Medium risk.

**Step 1 — Intent (on gateway page):**
- "Publish draft" link → navigates to `/gateway/[agent_id]/confirm?action=publish`
- Only rendered for users with `gateway.publish` permission

**Step 2 — Confirmation page (`/gateway/[agent_id]/confirm`):**
- `requirePermission("gateway.publish")` at page load
- Re-fetches agent config from Mother (live, not cached)
- Displays: agent ID, current active version, draft version, diff summary (dirty/clean)
- Optional `note` text input (short, plain text, max 240 chars)
- Single Confirm button → triggers `publishDraftAction` server action
- Cancel link → returns to gateway page

### 7.2 Rollback — two-step, requires confirmation, version selection
Risk: replaces active config with a historical version. Higher risk than publish. Requires selecting a target version.

**Step 1 — Intent (on gateway version history table):**
- Each version row has a "Rollback to this version" link → navigates to `/gateway/[agent_id]/confirm?action=rollback&version=N`
- Only rendered for users with `gateway.rollback` permission

**Step 2 — Confirmation page (`/gateway/[agent_id]/confirm`):**
- `requirePermission("gateway.rollback")` at page load
- Validates `version` param is a positive integer; redirects to gateway on invalid
- Re-fetches agent config AND version list from Mother
- Displays: target version details, current active version, note input
- Single Confirm button → triggers `rollbackAction` server action
- Cancel link → returns to gateway page

### 7.3 Validate — single step, no confirmation needed
Risk: read-like POST, no state change in Mother. Low risk.

- "Validate draft" button on gateway page → triggers `validateDraftAction` directly (no confirm page)
- Result displayed on redirect back to gateway page via `?validate_ok=1` or `?validate_error=...`
- Only rendered for users with `gateway.publish` permission (validate is a publish pre-check)

---

## 8. Error Handling Design

### 8.1 Error taxonomy

| Error | Cause | Dashboard handling |
|---|---|---|
| Permission denied | Session expired or role changed | `requirePermission` redirects to `/login` or throws → uncaught → Next.js error page |
| Empty or invalid `agent_id` | Malformed form | Guard: redirect to `/gateway?error=missing_agent_id` |
| Invalid `target_version` | Non-integer, zero, or negative | Guard: redirect to `/gateway?error=invalid_version` |
| Mother unreachable | Network / process | `postMotherJson` returns `{ok: false, error: "Request timed out"}` → audit failure → redirect with code |
| Mother rejects publish (4xx) | No draft, draft == active, policy | Audit failure → `?error=publish_failed` |
| Mother rejects rollback (4xx) | Version not found, already active version | Audit failure → `?error=rollback_failed` |
| Mother validation fails | Invalid config content | Audit logged as `config.validate` with `result: "failure"` → `?validate_error=validation_failed` |

### 8.2 Sanitized error codes (no raw Mother error to browser)

| Server action | Success code | Failure code |
|---|---|---|
| `validateDraftAction` | `?validate_ok=valid` | `?validate_error=validation_failed` or `?validate_error=validate_request_failed` |
| `publishDraftAction` | `?ok=published` | `?error=publish_failed` or `?error=missing_agent_id` |
| `rollbackAction` | `?ok=rolled_back` | `?error=rollback_failed` or `?error=invalid_version` |

### 8.3 Note field error
If the note field is empty, no error is raised — the publish/rollback note is optional in the Mother API. An empty note is passed as an empty string.

---

## 9. UI Placement and Visibility Rules

### 9.1 Gateway page (`/gateway`)
- **Validate draft**: SectionCard button, visible only to `gateway.publish` holders, rendered below the diff card
- **Publish intent link**: same card, visible only to `gateway.publish` holders
- **Rollback intent links**: version history table, one link per row, visible only to `gateway.rollback` holders
- **Validation result**: `?validate_ok=` / `?validate_error=` displayed as notice/error strip
- **Readonly-banner**: updated conditionally — remains for `gateway.view`-only users, changes wording for users with write permissions

### 9.2 Confirmation page (`/gateway/[agent_id]/confirm`)
- New server component, gated by `requirePermission("gateway.publish")` or `requirePermission("gateway.rollback")` depending on action
- Invalid/absent `action` param → redirect to gateway page
- Invalid `agent_id` (empty or not in agents list) → redirect to gateway page

### 9.3 No action buttons on agents list
Agent management pages (`/agents`, `/agents/[agent_id]`) do not get config write controls. Config workflow stays on the `/gateway` page.

---

## 10. Rollback / No-Op Behavior

### 10.1 Publish no-op
If the draft config is identical to the active config (`dirty: false`), publishing is technically a no-op in terms of config content but Mother still creates a new version record. The dashboard does not block publish when `dirty: false` — it is Mother's responsibility to decide. The dashboard displays the diff status prominently on the confirm page to inform the operator.

### 10.2 Rollback idempotency
| Scenario | Mother behavior | Dashboard behavior |
|---|---|---|
| Rollback to current active version | 4xx or no-op | Audit failure; operator sees `?error=rollback_failed` |
| Rollback to version that does not exist | 4xx | Audit failure; operator sees `?error=rollback_failed` |
| Double-submit rollback | Second request hits same Mother endpoint | Second call may succeed or fail depending on Mother state; both attempts audited independently |

### 10.3 No undo from dashboard
There is no "undo publish" or "undo rollback" from the dashboard. The only recovery path is a subsequent rollback to the previous version. This must be communicated clearly in the confirmation UI.

---

## 11. Implementation Phases

### Phase 1 — Validate server action (no confirm needed)
**Files:** `app/(dashboard)/gateway/page.tsx`  
**Task:**
- Add `validateDraftAction` server action inside `GatewayPage`
- Action: `requirePermission("gateway.publish")` → `getMotherAgentConfigDraft(agentId)` → `validateMotherAgentConfig(agentId, draft.config)` → audit → redirect with result code
- Add `?validate_ok` / `?validate_error` searchParams display on the page
- Add "Validate draft" button in a new `SectionCard title="Config actions"`, conditional on `hasPermission(auth, "gateway.publish")`  
**No confirm page yet.**  
**Test:** `npm run build` clean. TypeScript must accept `draft.config` as `unknown` passed to `validateMotherAgentConfig`.

### Phase 2 — Config actions card (publish intent + rollback intent)
**Files:** `app/(dashboard)/gateway/page.tsx`  
**Task:**
- Add "Publish draft" link → `/gateway/${agentId}/confirm?action=publish` (conditional on `gateway.publish`)
- Add "Rollback →" link per version row → `/gateway/${agentId}/confirm?action=rollback&version=${v.version}` (conditional on `gateway.rollback`)
- Update readonly-banner: show management-enabled message to users with any write permission; keep read-only message for `gateway.view`-only users
- Update safety model card to reflect reality for write-permission users  
**No confirm page yet — links lead to 404 during development.**  
**Test:** `npm run build` clean. `hasPermission(auth, "gateway.publish")` and `hasPermission(auth, "gateway.rollback")` must not cause TypeScript errors.

### Phase 3 — Confirmation page (publish and rollback)
**Files:** New `app/(dashboard)/gateway/[agent_id]/confirm/page.tsx`  
**Task:**
- Server component: read `params.agent_id` and `searchParams.action` + `searchParams.version`
- Validate action = `"publish"` | `"rollback"` — redirect to gateway on invalid
- For rollback: validate `version` is a positive integer — redirect on invalid
- `requirePermission` appropriate to action at page load
- Re-fetch agent config + version list from Mother live
- Render confirmation summary: agent ID, action, current active version, target/draft info, note input
- Form → `publishDraftAction` or `rollbackAction` server action  
**Test:** `npm run build` clean. Confirm page renders error state correctly when Mother is unreachable.

### Phase 4 — Publish and rollback server actions
**Files:** `app/(dashboard)/gateway/[agent_id]/confirm/page.tsx`  
**Task:**
- `publishDraftAction`: `requirePermission("gateway.publish")` → validate `agentId` → sanitize `note` → `publishMotherAgentConfig(agentId, note)` → audit → redirect
- `rollbackAction`: `requirePermission("gateway.rollback")` → validate `agentId` + `targetVersion` → sanitize `note` → `rollbackMotherAgentConfig(agentId, targetVersion, note)` → audit → redirect
- Both actions: audit on success AND failure; no raw Mother error to browser  
**Test:** `npm run build` clean.

### Phase 5 — Update gateway page readonly-banner and safety model
**Files:** `app/(dashboard)/gateway/page.tsx`  
**Task:**
- `?ok=published` / `?ok=rolled_back` display on gateway page (success notice)
- `?error=...` display on gateway page (error strip)
- Remove "No write, publish, or rollback action is exposed in this dashboard" from both the `readonly-banner` and the `safety model` card — replace with accurate conditional text
- `searchParams` must be added to `GatewayPage` props  
**Test:** `npm run build` clean.

### Phase 6 — Audit trail verification (no code change)
**Task:** Manually verify that `config.validate`, `config.publish`, and `config.rollback` events appear in `/audit` with correct `target_type: "agent_config"`, `target_id: agentId`, `result`, and `actor_username` populated.

---

## 12. Files To Be Created or Modified

| Phase | File | Change type |
|---|---|---|
| 1 | `app/(dashboard)/gateway/page.tsx` | Update (validate action + display) |
| 2 | `app/(dashboard)/gateway/page.tsx` | Update (intent links, banner, safety model) |
| 3 | `app/(dashboard)/gateway/[agent_id]/confirm/page.tsx` | **New** |
| 4 | `app/(dashboard)/gateway/[agent_id]/confirm/page.tsx` | Update (publish + rollback server actions) |
| 5 | `app/(dashboard)/gateway/page.tsx` | Update (ok/error searchParams, banner text) |
| 6 | `/audit` (read-only verification) | — |

**Total new files:** 1 (`gateway/[agent_id]/confirm/page.tsx`)  
**Total updated files:** 1 (`gateway/page.tsx`)  
**No changes to:** `lib/api.ts`, `lib/auth.ts`, `lib/rbac.ts`, `lib/user-store.ts`, `middleware.ts`, Mother, Agent, PHP Gateway

---

## 13. Security Checklist

| Check | Enforcement point |
|---|---|
| Management token never in browser | `postMotherJson` — server-only import in `lib/api.ts` |
| Browser never calls Mother directly | All config write functions are `"use server"` — no `fetch()` to Mother in client code |
| `agent_id` from server-rendered hidden field, not editable | Hidden input rendered server-side from URL param, `encodeURIComponent` before Mother call |
| `target_version` validated as positive integer before use | Guard at top of `rollbackAction` |
| `note` field truncated before Mother and audit | `slice(0, 240)` in action before any use |
| Permission checked inside action, not only at page load | `requirePermission` at top of each server action |
| Audit records failures, not just successes | Audit append in both success and error branches |
| No raw Mother error in browser | Redirects use predefined codes only |
| Actor identity from session, not form body | `motherActorHeaders(auth)` built from `requirePermission` return, not `formData` |

---

## 14. Blockers

| Blocker | Impact | Resolution |
|---|---|---|
| **No Mother draft-write API** | `gateway.draft.write` permission exists but there is no `lib/api.ts` function to write a draft config. The `controlPlaneConfigFromForm` dead-code helper has no corresponding API call. | **Draft write is deferred.** R10.24 implements only validate + publish + rollback. Draft write requires a confirmed Mother endpoint (PUT or PATCH `/v1/agents/:id/config/draft` or similar). |
| Shadow-only mode communication | Operators may misunderstand "publish" as a live traffic action. | Mitigated in confirmation UI: prominently display "shadow-only mode — this does not change live traffic." |
| Validate requires passing the draft config object | `validateMotherAgentConfig(agentId, config)` needs the config as `unknown`. Must fetch draft first inside the action (`getMotherAgentConfigDraft`). Two Mother round-trips inside one action (fetch draft → validate). | Acceptable. Both calls are server-side. If draft fetch fails, audit failure logged, redirect with `?validate_error=draft_unavailable`. |

---

## 15. Not In Scope for Config Workflow

| Feature | Reason excluded |
|---|---|
| Draft config editing / writing | No Mother API endpoint — blocked (see §14) |
| Bulk publish (multiple agents) | No Mother bulk endpoint; high risk |
| Scheduled publish | No scheduling infrastructure in dashboard |
| Config diff editor | Would require a rich editor component; no Mother write-draft API |
| Compare arbitrary versions | No Mother endpoint for version-to-version diff; current diff is active-vs-draft only |
| Force-deliver config to agent | No Mother endpoint exposed |
| Config import from file upload | No Mother endpoint; out of scope |

---

*End of safety plan. No code changes accompany this document.*
