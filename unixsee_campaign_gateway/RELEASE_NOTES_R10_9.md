# R10.9 — Agents UI Polish

## Scope

UI-only polish of the Agents pages, following the same visual language introduced for the Overview page in R10.8. No changes to auth, RBAC, API logic, Mother Go, Agent Go, PHP Gateway, or credential/token handling. The browser continues to receive all Mother data exclusively through the server-rendered dashboard — no direct Mother access was added.

## Pages touched

- `/agents` — Agent registry overview
- `/agents/[agent_id]` — Agent detail

## Shared components touched

- `components/AgentCard.tsx`
- `app/globals.css` (additive classes only)

## What changed

### Agents (`/agents`)

- Added a registry status hero panel summarizing online/stale/unknown counts and overall registry health, with a status pill in the page header.
- Replaced the flat 6-tile KPI row with a leaner 4-tile row (fresh telemetry, missing telemetry, average match rate, active alerts) — redundant totals moved into the hero panel.
- Agent registry section now shows a count line ("N agents registered") above the card grid.
- Empty states (no agents registered, no table rows) now use icon + tone styling instead of plain text.
- Registry table's telemetry column already used status pills; no change needed there.
- Raw JSON remains hidden inside the collapsed `RawJsonDrawer` at the bottom of the page, unchanged in behavior.

### Agent detail (`/agents/[agent_id]`)

- Added an identity/connection hero panel: connection status badge, agent ID, last seen, source IP, and policy pull count, plus telemetry/config-sync/assignment status pills.
- Page header now carries a status pill reflecting live connection state.
- KPI grid trimmed to the four metrics not already surfaced in the hero panel (policy pulls, config version, received, mismatched).
- "Active config" and "Latest telemetry" panels now show a polished empty state when no data exists yet, instead of always rendering an (empty) raw JSON drawer.
- Config versions, events, and active alerts empty states upgraded to icon + tone styling for consistency with the rest of the dashboard.
- Raw JSON stays behind collapsed drawers only; no large JSON is shown by default anywhere on the page.

### Shared

- `AgentCard`: telemetry state is now shown as a color-coded status pill (online/stale/missing) instead of a plain gray tag, and a "Last seen" footer row was added for quicker scanning. Added a subtle hover state.
- `globals.css`: added `.agent-foot`, `.agent-card:hover`, `.detail-hero-id`, and `.detail-hero-meta` rules. Reused the existing `.hero-panel` / `.hero-stats` / `.pulse-grid` primitives introduced in R10.8 — no new page-specific layout systems were created.

## Verification

- `npm run build` completed successfully (all 15 routes compiled, TypeScript check passed).
- Confirmed no Persian text, no Google Fonts/CDN references, and no AI-mock terminology were introduced.
- Confirmed the browser continues to receive Mother data only via server-rendered pages (`getMother*` calls remain server-side in `lib/api.ts`, unchanged).
- Confirmed no raw JSON is rendered outside of `RawJsonDrawer` (collapsed by default).

## Files changed since R10.8

- `dashboard/app/(dashboard)/agents/page.tsx`
- `dashboard/app/(dashboard)/agents/[agent_id]/page.tsx`
- `dashboard/components/AgentCard.tsx`
- `dashboard/app/globals.css`
- `RELEASE_NOTES_R10_9.md` (new)
