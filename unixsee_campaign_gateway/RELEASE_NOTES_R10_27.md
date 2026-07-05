# R10.27 — Gateway Page Null-Safety Fix

## Scope

This release fixes a production crash on the `/gateway` page only. No UI redesign, no new features, no backend changes, no auth/session/RBAC/token/storage logic changes, no Mother/Agent/PHP Gateway/install-core/deploy/enforcement/remote-command changes.

## Fix in this release

### `app/(dashboard)/gateway/page.tsx` — defensive Mother response handling

**Observed crash:** `TypeError: Cannot read properties of undefined (reading 'ok')` on the `/gateway` route.

**Cause:** When no agent was selected (`selectedAgent` empty — e.g. no agents registered yet, or an invalid/unrecognized `agent_id` query parameter), the config/diff/versions results were destructured from a literal `[undefined, undefined, undefined] as const` fallback tuple, combined with TypeScript non-null assertions (`cfgResult!`, `diffResult!`, `versionsResult!`) at each read site. Non-null assertions are erased at compile time and provide no runtime protection — they masked the fact that these values could genuinely be `undefined` at runtime, leaving the page one Mother-response-shape change away from an unguarded property access.

**Fix:** Replaced the `undefined` fallback tuple with a normalized fallback object (`{ ok: false, error: "No agent selected" }`) shared by all three result slots, and removed the non-null assertions entirely. `read()` (which already short-circuits safely) is now always called against a real, defined `ApiResult`-shaped object — never `undefined` — closing the gap for any future refactor that might rely on the assertion instead of an actual runtime guarantee.

**Behavior preserved:**
- `/gateway` renders the existing graceful "no agent selected" / error state when Mother data is missing, undefined, partial, or empty — no fake healthy data is introduced.
- All other reads on this page (`agentsResult.ok`, `draftResult.ok`, `result.ok` inside the validate action) were already sourced directly from awaited `lib/api.ts` calls, which always resolve to a defined `ApiResult` object — confirmed safe, no changes needed there.
- No changes to `lib/api.ts` were required — the undefined shape originated in the page's own fallback tuple, not in the API layer.
- Visual UI, alert/config action safety (confirmation flow, permission checks, audit events, sanitized redirects), and all R10.26 fixes are unchanged.

## Explicitly unchanged

- `lib/auth.ts`, `lib/rbac.ts`, `lib/user-store.ts` — no changes.
- Alert resolve/mute/unmute confirmation flow — unchanged, still routes through `/alerts/[alert_id]/confirm`.
- `components/ConfigEditor.tsx` — still unused, still fail-closed.
- `lib/api.ts` — still `import "server-only"`, still resolves Mother base URL only from `UNIXSEE_MOTHER_BASE_URL`.
- `package.json` — dev/start still bind to `127.0.0.1:8740` only.
- `next.config.js` — still has no Replit iframe/dev-origin exceptions; `X-Frame-Options: DENY` remains unconditional.
- PHP Gateway remains the runtime source of truth; Go Agent remains shadow-only; Mother API is read server-side only; Mother token never exposed to the browser.
- Dashboard remains English/LTR; no Persian UI text, no Google fonts/CDN, no Vite, no Express, no `pages/`, no `lib/mock-data.ts`, no AI mock terms.
