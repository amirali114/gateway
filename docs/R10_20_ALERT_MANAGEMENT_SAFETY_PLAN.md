# R10.20 Alert Management Safety Plan
**Project:** Unixsee Campaign Gateway Dashboard  
**Document type:** Safety design — implementation planning only. No code changes.  
**Base release:** R10.19  
**Date:** 2026-07-04  
**Scope:** Resolve, mute, and unmute alert actions — safety architecture, RBAC, audit trail, server action design, confirmation flow, error handling.

---

## 1. Context and Constraints

### 1.1 Current state (R10.19)
- `lib/api.ts` already exports `resolveMotherAlert`, `muteMotherAlert`, and `unmuteMotherAlert`. All three use `postMotherJson`, which injects `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` server-side via the `Authorization: Bearer` header. The browser never receives the token.
- `lib/rbac.ts` already defines the `alerts.manage` permission. No page or server action currently checks it.
- The alerts list (`/alerts`) and the new alert detail page (`/alerts/[alert_id]`) are both read-only with explicit `readonly-banner` declarations.
- The audit trail (`lib/user-store.ts` → `listAuditEvents`) is append-only JSONL. The `/users` page's server actions demonstrate the correct pattern for audit-safe writes.

### 1.2 Hard constraints (unchanged throughout implementation)
| Constraint | Rationale |
|---|---|
| Mother management token never leaves the server | Security. `postMotherJson` already enforces this. |
| Browser must never call Mother directly | Architecture. All Mother calls are in `"use server"` or server components. |
| No change to Mother, Agent, or PHP Gateway | Scope boundary. |
| No change to auth, session, RBAC, token, or storage logic | Stability. Existing patterns extended only, never modified. |
| All write actions gated by `requirePermission("alerts.manage")` | Access control. |
| Every action appended to audit trail | Accountability. |
| No silent failures | Every action returns a visible success or error state to the operator. |

---

## 2. RBAC Design

### 2.1 Permission mapping
The `alerts.manage` permission is already declared in `lib/rbac.ts`. The implementation must check it in every server action — not just at page load. This mirrors the pattern used in `/users/page.tsx` where `requirePermission("users.manage")` is called inside each server action.

| Role | `alerts.view` | `alerts.manage` |
|---|---|---|
| `admin` | ✅ | ✅ |
| `operator` | ✅ | ✅ (verify in rbac.ts before implementation) |
| `analyst` | ✅ | ❌ |
| `viewer` | ✅ | ❌ |

> **Implementation step:** Before writing any server action, grep `lib/rbac.ts` for the `alerts.manage` role assignments and confirm `operator` is included. If not, update `lib/rbac.ts` as part of Phase 1.

### 2.2 Double-guard pattern
Every server action must call `requirePermission("alerts.manage")` at its own top, even if the enclosing page already called `requirePermission("alerts.view")`. This prevents bypasses via direct form POST.

```
page load     → requirePermission("alerts.view")   [read access]
server action → requirePermission("alerts.manage") [write access, inside action]
```

---

## 3. Server Action Architecture

### 3.1 Why server actions (not route handlers)
The `/users` page demonstrates the correct pattern: `async function createUserAction(formData: FormData) { "use server"; ... }`. Server actions:
- Run server-side only — the browser receives only the redirect result.
- Can be placed inline in a server component, keeping all Mother-touching code in one file.
- Require no additional API route to secure.
- Integrate naturally with Next.js 16's form action model.

### 3.2 Action signatures (planned)

```typescript
// Resolve
async function resolveAlertAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("alerts.manage");
  const alertId = String(formData.get("alert_id") || "");
  // validate alertId non-empty
  // build actorHeaders from auth session
  // call resolveMotherAlert(alertId, actorHeaders)
  // append audit event
  // redirect with ?ok=resolved or ?error=...
}

// Mute
async function muteAlertAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("alerts.manage");
  const alertId = String(formData.get("alert_id") || "");
  // same pattern as resolve
}

// Unmute
async function unmuteAlertAction(formData: FormData): Promise<void> {
  "use server";
  const auth = await requirePermission("alerts.manage");
  const alertId = String(formData.get("alert_id") || "");
  // same pattern as mute
}
```

### 3.3 Actor headers
`postMotherJson` already accepts `actorHeaders: Record<string, string>`. The implementation must pass at minimum:

```typescript
const actorHeaders = {
  "X-Dashboard-Actor": auth.username,
  "X-Dashboard-Actor-Role": auth.role,
};
```

These headers are forwarded to Mother so it can record the acting user in its own log. They are sourced from the server-side session token — they are never read from the form body.

---

## 4. Audit Trail Design

### 4.1 Audit event schema
Every action appends a JSONL entry via the existing `user-store.ts` audit mechanism. The entry must include:

| Field | Value |
|---|---|
| `action` | `"alert.resolve"` / `"alert.mute"` / `"alert.unmute"` |
| `actor_id` | `auth.user_id` |
| `actor_username` | `auth.username` |
| `actor_role` | `auth.role` |
| `target_type` | `"alert"` |
| `target_id` | `alertId` |
| `result` | `"success"` or `"failure"` |
| `metadata.mother_status` | HTTP status from Mother response |
| `metadata.mother_error` | Error string from Mother (on failure only) |
| `ip_hash` | Hashed per existing audit policy |
| `ua_hash` | Hashed per existing audit policy |

### 4.2 Audit on failure
The audit trail must record both success and failure. On Mother API error, the entry is still appended with `result: "failure"` and `metadata.mother_error` populated. This creates an immutable record that an operator attempted the action even if Mother rejected it.

### 4.3 Audit trail is read-only from the UI
The `/audit` page already renders audit events. No new page is needed — resolve/mute/unmute events will appear automatically once they are appended.

---

## 5. Confirmation Flow Design

### 5.1 Requirement
Resolve and mute are irreversible or hard-to-reverse state changes. A mis-click must not immediately fire. The confirmation flow must work without JavaScript (progressive enhancement) and must not require a modal or client-side component.

### 5.2 Two-step form pattern (no JS required)

**Step 1 — Intent form** (on the alert detail page, visible only to `alerts.manage` holders):
```
┌─────────────────────────────────────────────────────┐
│  ⚠ Management action                                │
│  This action will be recorded in the audit trail.   │
│                                                     │
│  [Resolve this alert]  [Mute this alert]            │
│  Each button submits a hidden-field form to the     │
│  confirmation page: /alerts/:id/confirm?action=...  │
└─────────────────────────────────────────────────────┘
```

**Step 2 — Confirmation page** (`/alerts/[alert_id]/confirm`):
- New server component page.
- Re-fetches the alert from Mother to show current state.
- Shows a summary: alert ID, title, severity, action requested.
- Renders a single form with a hidden `alert_id` and `action` field.
- One `[Confirm]` button triggers the server action.
- One `[Cancel]` link returns to `/alerts/:id`.
- Requires `requirePermission("alerts.manage")` at page load.
- The server action is the same function used directly — the confirm page is just a second gate.

**Alternative (single-page confirm):** Place a confirm section on the detail page that is only revealed after clicking an intent button. This requires a small amount of client-side JavaScript (toggling a hidden `<div>`). This is acceptable but must not change any server-side logic.

### 5.3 Unmute — lower risk, no confirm step required
Unmute reverses a mute. It is a recovery action with no destructive consequence. It may use a direct single-step form (intent = action) without a separate confirmation page. This matches the pattern used for password reset in `/users`.

---

## 6. Error Handling Design

### 6.1 Error taxonomy

| Error type | Cause | Handling |
|---|---|---|
| Permission denied | Session expired or role changed mid-session | `requirePermission` throws → Next.js redirect to `/login` |
| Empty alert ID | Malformed form submission | Guard at top of action: `if (!alertId) redirect("?error=invalid_id")` |
| Mother unreachable | Network or process issue | `resolveMotherAlert` returns `{ok: false, error: "Request timed out"}` → audit failure + redirect with error |
| Mother rejects (4xx) | Alert already resolved, ID not found, policy | `result.ok === false` → audit failure + redirect with error |
| Mother rejects (5xx) | Internal Mother error | Same as 4xx path |
| Redirect race | User double-submits form | Server action is idempotent from Mother's perspective (resolve on already-resolved = no-op or 409); second request gets same redirect |

### 6.2 Error display
Following the pattern in `/users/page.tsx`: redirect to `?error=<message>` and render `<ErrorState>` in the page component when `searchParams.error` is set. No error detail from Mother is forwarded to the browser beyond the already-sanitized `ApiResult.error` string (max 220 chars, stack trace stripped).

### 6.3 Success display
Redirect to `?ok=resolved` / `?ok=muted` / `?ok=unmuted`. Page component renders a success notice strip below the header. The alert is re-fetched fresh on next load — state change from Mother is reflected immediately.

---

## 7. UI Placement and Visibility Rules

### 7.1 Alert detail page (`/alerts/[alert_id]`)
- Management actions are rendered in a dedicated **"Management actions"** `SectionCard`, positioned below the Safety model card and above the Raw JSON drawer.
- The card is **conditionally rendered**: it only renders if `hasPermission(auth, "alerts.manage")` returns `true`.
- Users without `alerts.manage` do not see the card — not even a disabled state. The `readonly-banner` remains visible to all users.

### 7.2 Alerts list (`/alerts`)
- No inline action buttons on the list. Management actions require navigating to the detail page.
- This keeps the list page read-only and avoids bulk-action footguns.

### 7.3 Confirmation page (`/alerts/[alert_id]/confirm`)
- Accessible only via form POST from the detail page (with `?action=resolve|mute` query).
- If accessed without a valid `action` param, redirects back to the detail page.
- Gated by `requirePermission("alerts.manage")`.

---

## 8. Rollback / No-Op Behavior

### 8.1 Mother is the source of truth
The dashboard has no rollback capability of its own. "Undo resolve" is not a dashboard feature — if an alert was incorrectly resolved, the operator must wait for Mother to re-raise it (via its alert evaluation cycle) or use Mother's direct API.

### 8.2 Idempotency
| Action | Already in target state | Mother behavior | Dashboard behavior |
|---|---|---|---|
| Resolve | Already resolved | 409 or no-op | Audit failure logged; operator sees error; no double-entry |
| Mute | Already muted | 409 or no-op | Same as above |
| Unmute | Already active | 409 or no-op | Same as above |

### 8.3 No cascade
Alert actions affect only the single alert targeted by its ID. The dashboard does not implement bulk resolve, bulk mute, or fleet-wide alert suppression. Each action targets one `alertId` from the form's hidden field.

---

## 9. Implementation Phases

### Phase 1 — RBAC verification (prerequisite)
**Files:** `unixsee_campaign_gateway/dashboard/lib/rbac.ts`  
**Task:** Confirm `operator` role includes `alerts.manage`. If not present, add it to the role permission matrix. No other file changes.  
**Test:** `npm run build` must remain clean.

### Phase 2 — Server actions (core write logic)
**Files:** `unixsee_campaign_gateway/dashboard/app/(dashboard)/alerts/[alert_id]/page.tsx`  
**Task:** Add three inline server actions (`resolveAlertAction`, `muteAlertAction`, `unmuteAlertAction`) with:
- `requirePermission("alerts.manage")` guard at action top
- `actorHeaders` built from session
- Mother API call (`resolveMotherAlert` / `muteMotherAlert` / `unmuteMotherAlert`)
- Audit event appended on success and failure
- `redirect()` to `?ok=...` or `?error=...`  
**No UI yet** — actions exist but are not wired to any form.  
**Test:** `npm run build` must remain clean. TypeScript must not see `actorHeaders` as `any`.

### Phase 3 — Management actions UI card
**Files:** `unixsee_campaign_gateway/dashboard/app/(dashboard)/alerts/[alert_id]/page.tsx`  
**Task:** Add the `SectionCard title="Management actions"` block, conditionally rendered on `hasPermission(auth, "alerts.manage")`. Wire intent forms to the confirmation page (`/alerts/[alert_id]/confirm`).  
**No confirmation page yet** — intent forms POST to a 404 at this point (acceptable during dev).  
**Test:** `npm run build` clean. Non-`alerts.manage` users see no card.

### Phase 4 — Confirmation page
**Files:** New `unixsee_campaign_gateway/dashboard/app/(dashboard)/alerts/[alert_id]/confirm/page.tsx`  
**Task:**  
- Server component: `requirePermission("alerts.manage")`, read `searchParams.action` and `params.alert_id`.
- Re-fetch the alert from Mother to show current state.
- Render summary + confirm form (action = the server action from Phase 2) + cancel link.
- Guard against invalid/missing `action` param (redirect to detail).  
**Test:** `npm run build` clean. Confirm page renders error state correctly when Mother is unreachable.

### Phase 5 — Error and success display on detail page
**Files:** `unixsee_campaign_gateway/dashboard/app/(dashboard)/alerts/[alert_id]/page.tsx`  
**Task:** Add `searchParams.ok` and `searchParams.error` handling to the detail page component. Render `<div className="notice">` on success, `<ErrorState>` on error.  
**Test:** `npm run build` clean. Verify TypeScript types for `searchParams`.

### Phase 6 — Unmute direct action (no confirm page)
**Files:** `unixsee_campaign_gateway/dashboard/app/(dashboard)/alerts/[alert_id]/page.tsx`  
**Task:** Wire the unmute form directly to `unmuteAlertAction` (no confirm step). Unmute is a recovery action and does not require a confirmation gate.  
**Test:** `npm run build` clean.

### Phase 7 — End-to-end audit trail verification
**Files:** `unixsee_campaign_gateway/dashboard/app/(dashboard)/audit/page.tsx` (read-only, no changes)  
**Task:** Manually verify that resolve/mute/unmute events appear in `/audit` after execution. Confirm `action`, `target_type`, `target_id`, `result`, and `actor_username` are all populated correctly.

---

## 10. Security Checklist

| Check | Enforcement point |
|---|---|
| Management token never in browser | `postMotherJson` — server-only import (`"server-only"` at top of `lib/api.ts`) |
| Browser never calls Mother directly | All alert actions are `"use server"` functions — no `fetch()` to Mother in client code |
| Actor identity from session, not form body | `actorHeaders` built from `requirePermission` return value, never from `formData` |
| Alert ID from form body but validated | Guard `if (!alertId || alertId.trim() === "") redirect("?error=invalid_id")` |
| Double-submit safety | Mother idempotency + audit deduplication not required (each attempt logged) |
| No secret values in redirects | Error messages are sanitized by `ApiResult.error` (max 220 chars, no stack traces) |
| RBAC enforced inside action, not just page load | `requirePermission("alerts.manage")` called at top of every server action |
| Audit records failures, not just successes | Audit append in both `try` (success) and `catch`/error branches |

---

## 11. Files to Be Created or Modified (Phase Summary)

| Phase | File | Change type |
|---|---|---|
| 1 | `lib/rbac.ts` | Update (add `alerts.manage` to `operator` if missing) |
| 2 | `app/(dashboard)/alerts/[alert_id]/page.tsx` | Update (add 3 server actions) |
| 3 | `app/(dashboard)/alerts/[alert_id]/page.tsx` | Update (add management UI card) |
| 4 | `app/(dashboard)/alerts/[alert_id]/confirm/page.tsx` | **New** |
| 5 | `app/(dashboard)/alerts/[alert_id]/page.tsx` | Update (searchParams ok/error display) |
| 6 | `app/(dashboard)/alerts/[alert_id]/page.tsx` | Update (unmute direct wire) |
| 7 | `/audit` (read-only verification, no code change) | — |

**Total new files:** 1 (`confirm/page.tsx`)  
**Total updated files:** 2 (`lib/rbac.ts`, `alerts/[alert_id]/page.tsx`)  
**No changes to:** `lib/api.ts`, `lib/auth.ts`, `lib/user-store.ts`, `lib/types.ts`, `middleware.ts`, Mother, Agent, PHP Gateway

---

## 12. Not In Scope for Alert Management

The following were considered and explicitly excluded:

| Feature | Reason excluded |
|---|---|
| Bulk resolve/mute | Risk of fleet-wide state change from a single mis-click; no Mother bulk endpoint documented |
| Alert deletion | No Mother delete endpoint exists |
| Alert snooze / TTL mute | Not supported by current Mother alert schema |
| Alert assignment to operator | No Mother field for ownership |
| Alert comment / annotation | No Mother field; would require a separate dashboard-local store |
| Re-raise / force re-evaluate | `evaluateMotherAlerts` POST exists but has no agent-scoped or alert-scoped targeting — fleet-wide only; deferred |

---

*End of safety plan. No code changes accompany this document.*
