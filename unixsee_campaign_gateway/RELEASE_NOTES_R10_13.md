# R10.13 — Users, Audit & Settings UI Polish

## Scope

UI-only polish of the Users, Audit, and Settings pages, following the same visual language introduced for Overview (R10.8), Agents (R10.9), Release/Production Readiness (R10.10), Mother/Diagnostics (R10.11), and Gateway/Policy/Alerts (R10.12). No changes to auth, RBAC, API logic, Mother Go, Agent Go, PHP Gateway, or credential/token handling. The browser continues to receive Mother data exclusively through server-rendered pages — no direct browser-to-Mother access was added.

## Pages touched

- `/users` — Users & RBAC
- `/audit` — Audit Trail
- `/settings` — Mother Settings

## Shared components touched

- None. All three pages were polished using existing shared components (`KpiCard`, `SectionCard`, `PageHeader`, `StatusPill`, `DataTable`, `EmptyState`, `ErrorState`, `RawJsonDrawer`) and existing CSS primitives already introduced in prior releases (`.hero-panel`, `.hero-main`, `.hero-stats`, `.readonly-banner`, `.checklist-cards`). No new CSS classes were required.

## What changed

### Users (`/users`)

- Added a persistent read-only banner clarifying this page is scoped to local dashboard accounts only, that password hashes are never displayed, that there is no user-deletion control, and that nothing here touches Mother, Agent, or PHP Gateway credentials.
- Added a status hero panel summarizing total dashboard users, active vs. disabled counts, number of roles in use, and current permission level (manage vs. view-only), reinforcing that account deletion is not available anywhere in this dashboard.
- Added a new "Safety model" section as a two-column checklist card grid spelling out that secrets are never rendered, edits are permission-gated, no deletion control exists, and RBAC scope is limited to the dashboard.
- Existing user table, inline update/reset-password forms, and create-user form are unchanged structurally and remain permission-gated exactly as before — no new action buttons were added.
- Sanitized users JSON remains hidden inside the collapsed `RawJsonDrawer`, unchanged in behavior.

### Audit (`/audit`)

- Added a persistent read-only banner stating that every dashboard action is recorded for accountability, that history cannot be edited or deleted from this page, and that only irreversible hashes of IP/user-agent are ever stored — never raw values.
- Added a status hero panel summarizing total recorded events, success/failure counts, distinct actor count, and how many events are currently shown versus the full unfiltered total.
- Filters, events table, and per-row metadata drawer are unchanged structurally.
- Empty state now distinguishes between "no events at all" and "no events match the current filters," clearly guiding the user to clear filters when applicable.

### Settings (`/settings`)

- Added a persistent read-only banner clarifying that this page shows configuration posture only — never secret, token, or credential values — and that no runtime configuration file can be edited from the browser.
- Added a status hero panel summarizing overall configuration posture ("Fully configured" / "Needs attention") based on auth, session secret, and management token presence, plus at-a-glance auth/Mother/storage/policy-sync stats.
- Added a new "Safety posture" section as a two-column checklist card grid explaining that secret fields show configured/missing status only, Mother is reached exclusively server-side, no configuration file can be edited here, and policy/storage details are evidence rather than a control surface.
- Existing KPI row, dashboard-security table, and Mother-policies table are unchanged structurally; still status-pill driven with no values exposed.
- Raw settings payload remains hidden inside the collapsed `RawJsonDrawer`, unchanged in behavior.

## Verification

- `npm run build` completed successfully inside `dashboard/` (all 16 routes compiled, TypeScript check passed).
- Confirmed no Persian text, no Google Fonts/CDN references, and no "AI mock" terminology were introduced.
- Confirmed the browser continues to receive Mother data only via server-rendered pages (`getMother*` calls remain server-side in `lib/api.ts`, unchanged); no new client-side fetches to Mother were added.
- Confirmed no raw JSON is rendered outside of `RawJsonDrawer` (collapsed by default) on any of the three pages.
- Confirmed no secret, token, password hash, or credential value is rendered anywhere on Users, Audit, or Settings — only presence/status pills.
- Confirmed no new destructive or unsupported action buttons were added; existing update/reset-password/create-user forms remain exactly as permission-gated as before, and there is still no user-deletion control.
- Confirmed auth (`requirePermission`), RBAC checks, and all API/runtime code paths for Mother, Agent, and the PHP Gateway were left untouched.

## Files changed since R10.12

- `dashboard/app/(dashboard)/users/page.tsx`
- `dashboard/app/(dashboard)/audit/page.tsx`
- `dashboard/app/(dashboard)/settings/page.tsx`
- `RELEASE_NOTES_R10_13.md` (new)
