# R10.12 — Gateway, Policy & Alerts UI Polish

## Scope

UI-only polish of the Gateway, Policy, and Alerts pages, following the same visual language introduced for Overview (R10.8), Agents (R10.9), Release/Production Readiness (R10.10), and Mother/Diagnostics (R10.11). No changes to auth, RBAC, API logic, Mother Go, Agent Go, PHP Gateway, or credential/token handling. The browser continues to receive Mother data exclusively through server-rendered pages — no direct browser-to-Mother access was added.

## Pages touched

- `/gateway` — Gateway Control
- `/policy` — Policy Sync
- `/alerts` — Alert Center

## Shared components touched

- None. All three pages were polished using existing shared components (`KpiCard`, `SectionCard`, `PageHeader`, `StatusPill`, `DataTable`, `EmptyState`, `ErrorState`, `RawJsonDrawer`, `AgentSelector`) and existing CSS primitives already introduced in prior releases (`.hero-panel`, `.hero-main`, `.hero-stats`, `.readonly-banner`, `.checklist-cards`, `.pulse-grid`). No new CSS classes were required.

## What changed

### Gateway (`/gateway`)

- Added a persistent read-only banner stating plainly that the PHP Gateway is the runtime source of truth, that agents operate in shadow-only mode, and that no write/publish/rollback action exists on this page.
- Added a status hero panel showing runtime mode (Shadow-only), runtime source (PHP Gateway), enforcement (None), agents registered, and whether the selected agent's config is in sync or has a pending draft.
- KPI row now color-codes the "Dirty" tile by tone (warning when the draft differs, success when in sync) instead of neutral styling.
- Added a new "Safety model" section rendered as a two-column checklist card grid, spelling out that the PHP Gateway remains authoritative, agents never enforce, config here is evidence not control, and no write/publish/rollback action is exposed.
- Active config and draft diff remain hidden inside collapsed `RawJsonDrawer` panels, unchanged in behavior.

### Policy (`/policy`)

- Added a persistent read-only banner clarifying this page is a read-only catalog view with no editor, publish, or assignment control — policy changes happen only through safe Mother APIs elsewhere.
- Added a status hero panel summarizing the default policy ID, profile, version, and source, plus sync status, catalog size, assignment control ownership, and enforcement posture (None) at a glance.
- Added a new "Safety posture" section as a two-column checklist card grid explaining that policies are read live on every page load, assignment happens only through audited Mother APIs, no editor/publish/delete control exists here, and policies inform shadow-only evaluation rather than enforcing PHP Gateway traffic.
- Default policy table and policy catalog table are unchanged structurally; still status-pill driven.
- Raw JSON remains hidden inside the collapsed `RawJsonDrawer` at the bottom of the page, unchanged in behavior.

### Alerts (`/alerts`)

- Added a persistent read-only banner stating that acknowledge, mute, and resolve actions are not exposed here — alert state changes only through Mother, and this page simply reflects it.
- Added a status hero panel summarizing overall alert posture (Nominal / Attention / Critical, derived from live critical/warn counts) with a plain-language summary of active alert count, number of scopes involved, and alerts resolved in the last 24 hours.
- KPI row extended with an "Info" tile (previously only shown in the raw summary) alongside the existing Active/Critical/Warn/Muted/Resolved tiles, all tone-coded for at-a-glance scanning.
- Added a new "Alerts by scope" section presenting active alert counts grouped by originating subsystem as a pulse grid, with a clean, worded empty state when no per-scope breakdown is available — previously this data was only visible inside the raw JSON drawer.
- Active alerts table and its existing empty/error states are unchanged structurally; still status-pill driven per row.
- Raw JSON stays behind a collapsed drawer only; no large payloads are rendered by default.

## Verification

- `npm run build` completed successfully inside `dashboard/` (all 16 routes compiled, TypeScript check passed).
- Confirmed no Persian text, no Google Fonts/CDN references, and no "AI mock" terminology were introduced.
- Confirmed the browser continues to receive Mother data only via server-rendered pages (`getMother*` calls remain server-side in `lib/api.ts`, unchanged); no new client-side fetches to Mother were added.
- Confirmed no raw JSON is rendered outside of `RawJsonDrawer` (collapsed by default) on any of the three pages.
- Confirmed none of the three pages exposes a write, publish, rollback, assign, acknowledge, mute, resolve, or remote-command control — all remain evidence-only, read-only views.
- Confirmed auth (`requirePermission`), RBAC checks, and all API/runtime code paths for Mother, Agent, and the PHP Gateway were left untouched.

## Files changed since R10.11

- `dashboard/app/(dashboard)/gateway/page.tsx`
- `dashboard/app/(dashboard)/policy/page.tsx`
- `dashboard/app/(dashboard)/alerts/page.tsx`
- `RELEASE_NOTES_R10_12.md` (new)
