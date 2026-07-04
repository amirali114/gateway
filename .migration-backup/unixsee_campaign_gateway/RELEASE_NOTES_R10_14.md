# R10.14 — Sync, Login & Final Consistency Pass

## Scope

UI-only polish of the Sync page, a visual-only refresh of the Login page, and a small final consistency pass across shared CSS. This closes out the visual polish series that began with Overview (R10.8) and continued through Agents (R10.9), Release/Production Readiness (R10.10), Mother/Diagnostics (R10.11), Gateway/Policy/Alerts (R10.12), and Users/Audit/Settings (R10.13). No changes to auth, RBAC, API logic, Mother Go, Agent Go, PHP Gateway, tokens, or storage. Already-accepted pages from prior releases were not redesigned.

## Pages touched

- `/sync` — Policy Sync
- `/login` — Sign in

## Shared components touched

- `app/globals.css` — added `.login-brand`, `.login-mark`, and `.login-footnote` rules to bring the login card in line with the dark operational dashboard style already used elsewhere (badge treatment, footnote/banner spacing). No existing class was renamed or removed; all other pages continue to use the same primitives (`.hero-panel`, `.hero-main`, `.hero-stats`, `.readonly-banner`, `.checklist-cards`) unchanged.

## What changed

### Sync (`/sync`)

- Added a persistent read-only banner stating explicitly that this page only reflects pull/acknowledgement state Mother has already recorded, and that it cannot trigger a push, force a resync, or send any command to an Agent.
- Added a status hero panel summarizing total tracked agents, in-sync count, stale count, unknown count, and a plain "Push available: No" indicator.
- Existing sync-state table and its empty state are unchanged structurally; still status-pill driven per row.
- Raw sync payload remains hidden inside the collapsed `RawJsonDrawer`, unchanged in behavior.

### Login (`/login`)

- `loginAction` import, form fields (`username`/`password`), and submit behavior are completely unchanged — this was a visual-only pass.
- Added a small badge mark next to the "Unixsee Gateway" wordmark, styled consistently with the badge treatment used in hero panels across the rest of the dashboard, for stronger brand/visual continuity between the login screen and the authenticated dashboard shell.
- Restyled the session-cookie disclosure as a bordered footnote row (matching the visual weight of the read-only banners used elsewhere) and extended its copy to also state plainly that the dashboard never fetches Mother directly from the browser.
- Logout route (`app/logout/route.ts`) was not touched.

### Final consistency pass

- Reviewed spacing, card borders, typography, and empty states across all eleven dashboard pages; found them already consistent from prior releases (`--border`, `--border-soft`, `.section-card`, `.empty-state` shared throughout). Only the login page needed new rules, added above — no other shared CSS required changes.

## Verification

- `npm run build` completed successfully inside `dashboard/` (all 16 routes compiled, TypeScript check passed).
- Confirmed no Persian text, no Google Fonts/CDN references, and no "AI mock" terminology were introduced.
- Confirmed the browser continues to receive Mother data only via server-rendered pages (`getMother*` calls remain server-side in `lib/api.ts`, unchanged); no new client-side fetches to Mother were added.
- Confirmed no raw JSON is rendered outside of `RawJsonDrawer` (collapsed by default) on the Sync page; the Login page has no raw JSON.
- Confirmed `loginAction` is still used unmodified, login fields remain `username`/`password`, and logout behavior (`app/logout/route.ts`) is untouched.
- Confirmed the Sync page exposes no push, resync, deploy, rollback, enforcement, or remote-command control — it remains an evidence-only, read-only view.
- Confirmed auth (`requirePermission`, `isAuthEnabled`, `currentSession`), RBAC checks, and all API/runtime code paths for Mother, Agent, and the PHP Gateway were left untouched.
- Confirmed no previously-accepted page (Overview, Agents, Release, Mother, Diagnostics, Gateway, Policy, Alerts, Users, Audit, Settings) was redesigned in this release.

## Files changed since R10.13

- `dashboard/app/(dashboard)/sync/page.tsx`
- `dashboard/app/login/page.tsx`
- `dashboard/app/globals.css`
- `RELEASE_NOTES_R10_14.md` (new)
