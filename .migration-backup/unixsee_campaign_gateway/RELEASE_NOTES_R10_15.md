# R10.15 — Final QA Pass

## Scope
Final quality-assurance pass over the R10.14 baseline. No redesign work performed. Only the explicitly authorized safe cleanup (unstable `Math.random()` React keys) was applied.

## Pages touched
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/agents/page.tsx`
- `app/(dashboard)/diagnostics/page.tsx`
- `app/(dashboard)/sync/page.tsx`

## Shared components touched
- `components/AgentSelector.tsx`

## What changed
- Replaced 5 instances of `agent.agent_id || Math.random()` (and one `id || Math.random()` in `AgentSelector`) used as React list keys with stable fallbacks derived from the map index (e.g. `` `agent-${index}` ``, `` `agent-row-${index}` ``, `` `agent-diag-${index}` ``, `` `agent-sync-${index}` ``). This removes non-deterministic keys that could cause unnecessary re-renders or hydration key churn, without changing any visual output, data, or behavior.

## Verification
- `npm ci` in `dashboard/`: clean install, 0 vulnerabilities.
- `npm run build` (`next build`): compiled successfully, all routes generated:
  `/`, `/agents`, `/agents/[agent_id]`, `/alerts`, `/audit`, `/diagnostics`, `/gateway`, `/login`, `/logout`, `/mother`, `/policy`, `/release`, `/settings`, `/settings/production`, `/sync`, `/users`.
- Searched `app/`, `components/`, `lib/` (excluding `node_modules`) for: Persian/non-Latin script text, Google Fonts/CDN references, "AI mock" terminology, TODO/FIXME/unimplemented throw stubs — no matches found in source.
- Confirmed no browser-side fetches to Mother: `lib/api.ts` (server-only module) is the sole place Mother is called; no `fetch(` calls exist in `components/`.
- Confirmed no exposed secrets: `settings` pages only render boolean/status indicators (`session_secret_configured`, `management_token_configured`), never raw token/secret values.
- Confirmed `loginAction` (from `app/login/actions.ts`) still wired to the login form; `username` and `password` (type="password") fields intact; logout route (`/logout`) still present and built.
- Confirmed RBAC guards (`requirePermission(...)`) present at the top of every dashboard route's `page.tsx`.
- Confirmed raw JSON is only ever rendered inside collapsed `<details>`-based `RawJsonDrawer` components, never inline in the main page body.
- Cleaned `node_modules` and `.next` from the dashboard directory before packaging; final zip contains only source and config files.

## Files changed since previous release (R10.14)
- `dashboard/app/(dashboard)/page.tsx`
- `dashboard/app/(dashboard)/agents/page.tsx`
- `dashboard/app/(dashboard)/diagnostics/page.tsx`
- `dashboard/app/(dashboard)/sync/page.tsx`
- `dashboard/components/AgentSelector.tsx`
- `RELEASE_NOTES_R10_15.md` (added)
