# Release Notes — R10.17 Final Visual Acceptance

**Release:** R10.17  
**Date:** 2026-07-04  
**Scope:** UI / visual acceptance pass — dashboard only. No auth, RBAC, API, runtime, or Mother changes.

---

## Summary

R10.17 is a final visual acceptance pass over all 15 dashboard pages (Overview, Agents, Agent detail,
Mother, Diagnostics, Policy, Release, Gateway, Alerts, Users, Audit, Settings, Production readiness,
Sync, Login). Only targeted visual and product-completeness fixes were made — no page was redesigned.

---

## Changed files

### `components/Sidebar.tsx`
- **Added `/sync` nav item** (`⇄` icon, `agents.view` permission) between Agents and Release.
  The Sync page existed since R10.14 but had no sidebar link, making it unreachable from navigation.

### `app/(dashboard)/sync/page.tsx`
- Added `KpiCard` row showing **In sync**, **Stale / error**, **Unknown**, and **Total policy pulls**
  counts, matching the layout density of all other pages.
- Added `StatusPill` page-level posture badge to `PageHeader` (`meta` prop).
- Agent IDs in the sync table are now hyperlinks to `/agents/[agent_id]`.
- Empty state description now references the Agents install guide.
- `inSync` filter extended to include `config_sync_status === "ok"` (some Mother versions use this value).
- `stale` filter now excludes `"unknown"` so only genuine error states count as stale.
- Added `PillTone` import for explicit posture typing.

### `app/(dashboard)/settings/production/page.tsx`
- Fixed `ok()` helper: failing checks now render `StatusPill value="fail"` (red danger pill) instead of
  `value="unknown"` (yellow warning pill). Failing a readiness check is not "unknown" — it is a failure.

### `app/(dashboard)/agents/[agent_id]/page.tsx`
- Stale/unknown posture banner: replaced `style={{ borderLeftColor: ... }}` inline style (which cannot
  override a CSS `border` shorthand) with proper `className` variants: `"readonly-banner tone-warning"`
  for stale agents, `"readonly-banner tone-neutral"` for unknown agents.

### `app/(dashboard)/mother/page.tsx`
- Fixed `style={{ color: "var(--tone-danger, #dc2626)" }}` on storage last-error cell.
  Correct CSS variable is `var(--danger, #ef4444)` as defined in `globals.css`.

### `app/globals.css`
- Added `.readonly-banner.tone-warning` variant: amber border, amber background tint, warm text.
- Added `.readonly-banner.tone-neutral` variant: slate border, near-transparent background, muted text.
  Both variants are used by the agent-detail stale/unknown posture banner.

---

## Pages reviewed — no changes needed

| Page | Assessment |
|---|---|
| Overview (`/`) | Complete. Hero + KPIs + pulse grid + agent cards + alerts table + raw drawer. |
| Agents (`/agents`) | Complete (R10.16). Telemetry freshness, policy sync state, install guidance added. |
| Agent detail (`/agents/[agent_id]`) | Complete (R10.16). Unavailable state, posture banner (fixed R10.17), telemetry + sync sections. |
| Mother (`/mother`) | Complete (R10.16). Core status, storage detail, safety model. CSS var fixed R10.17. |
| Diagnostics (`/diagnostics`) | Complete (R10.16). Alert posture with scope breakdown, config rollout posture. |
| Policy (`/policy`) | Complete (R10.16). Sync state section, ready endpoint data, posture banner. |
| Release (`/release`) | Complete (R10.16). Gate posture strip, posture checklist, blockers, alerts. |
| Gateway (`/gateway`) | Complete. Shadow-only banner, agent selector, config/diff/versions, safety model. |
| Alerts (`/alerts`) | Complete. Hero, KPIs, scope pulse-grid, active alert table, raw drawer. |
| Users (`/users`) | Complete. Hero, user table with RBAC controls, create form (gated), safety model. |
| Audit (`/audit`) | Complete. Hero with event counts, filter form, event table, raw drawer. |
| Settings (`/settings`) | Complete. Security posture, Mother + policy + storage KPIs, safety model. |
| Production readiness (`/settings/production`) | Fixed ok() tone R10.17. Hero, KPIs, readiness checklist table. |
| Sync (`/sync`) | Added sidebar link + KpiCards R10.17. Was only reachable by direct URL. |
| Login (`/login`) | Complete. Brand mark, form, httpOnly session note. |

---

## Rules upheld
- English + LTR only. No Persian text.
- No deploy, rollback, or enforcement action surfaces.
- No new backend functions, API calls, auth/RBAC, or runtime changes.
- Raw JSON only inside `RawJsonDrawer` / collapse.
- Browser never fetches Mother directly.
- No Google fonts or external CDN references.
- No AI mock terms.

---

## Build
```
cd unixsee_campaign_gateway/dashboard
npm ci
npm run build
```
Result: 17 routes compiled, zero TypeScript errors.
