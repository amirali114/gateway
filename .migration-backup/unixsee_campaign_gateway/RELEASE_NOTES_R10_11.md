# R10.11 — Mother & Diagnostics UI Polish

## Scope

UI-only polish of the Mother Core and Diagnostics pages, following the same visual language introduced for Overview (R10.8), Agents (R10.9), and Release/Production Readiness (R10.10). No changes to auth, RBAC, API logic, Mother Go, Agent Go, PHP Gateway, or credential/token handling. The browser continues to receive Mother data exclusively through server-rendered pages — no direct browser-to-Mother access was added.

## Pages touched

- `/mother` — Mother Core
- `/diagnostics` — Diagnostics

## Shared components touched

- None. Both pages were polished using existing shared components (`KpiCard`, `SectionCard`, `PageHeader`, `StatusPill`, `DataTable`, `EmptyState`, `RawJsonDrawer`) and existing CSS primitives already introduced in prior releases (`.hero-panel`, `.hero-stats`, `.readonly-banner`, `.checklist-cards`, `.pulse-grid`). No new CSS classes were required.

## What changed

### Mother Core (`/mother`)

- Added a status hero panel summarizing overall Mother status (Operational / Degraded / Unavailable) derived from live `/healthz` and `/readyz` results, with a plain-language explanation of what the state means.
- Added a persistent read-only banner stating the dashboard calls Mother from the server only, the browser never receives the management token, and no control/command action exists on this page.
- KPI row now color-codes the Health and Ready tiles by tone (success/warning/danger) instead of neutral styling, and the "Mother URL" tile now shows a "Local-only" pill instead of printing the raw base URL, reinforcing that Mother access is server-side only.
- "Safety model" section re-rendered as a two-column checklist card grid (matching the pattern from R10.10) instead of a plain bulleted list.
- Raw JSON remains hidden inside the collapsed `RawJsonDrawer` at the bottom of the page, unchanged in behavior.

### Diagnostics (`/diagnostics`)

- Added a status hero panel summarizing overall diagnostics posture (Nominal / Attention needed / Unavailable) driven by live health, ready, and critical-alert counts.
- Added a persistent read-only banner clarifying that every value on the page is evidence read live from Mother, that no secrets/tokens/cookies are ever rendered, and that no remote-command action exists here.
- KPI row now color-codes health/ready/storage/critical-alert tiles by tone for faster at-a-glance scanning.
- Added a new "Alert summary" section presenting active alert counts by severity (critical/warning/info) plus alerts resolved in the last 24 hours as a 4-tile pulse grid, instead of surfacing only the single critical-alert count as before.
- Added a new "Storage detail" section (key/value table) showing engine, writable state, last load/save timestamps, and — when reported — database connectivity, schema version, migration status, and last storage error, all sourced from the existing storage-status call.
- Added a new "Release safety signals" section summarizing backup/restore, shadow-only safety, and public-exposure posture flags plus a recent-critical-events count, sourced from the existing health-report call (previously fetched but only exposed inside the raw JSON drawer).
- Agent diagnostics table is unchanged structurally; still status-pill driven per row.
- Raw JSON stays behind a collapsed drawer only; no large payloads are rendered by default.

## Verification

- `npm run build` completed successfully inside `dashboard/` (all 16 routes compiled, TypeScript check passed).
- Confirmed no Persian text, no Google Fonts/CDN references, and no "AI mock" terminology were introduced.
- Confirmed the browser continues to receive Mother data only via server-rendered pages (`getMother*` calls remain server-side in `lib/api.ts`, unchanged); no new client-side fetches to Mother were added.
- Confirmed no raw JSON is rendered outside of `RawJsonDrawer` (collapsed by default) on either page.
- Confirmed neither page exposes a deploy, promote, rollback, enforcement, or remote-command control — both remain evidence-only, read-only views.
- Confirmed auth (`requirePermission`), RBAC checks, and all API/runtime code paths for Mother, Agent, and the PHP Gateway were left untouched.

## Files changed since R10.10

- `dashboard/app/(dashboard)/mother/page.tsx`
- `dashboard/app/(dashboard)/diagnostics/page.tsx`
- `RELEASE_NOTES_R10_11.md` (new)
