# R10.26 — Action Surface QA Release Notes

## Scope

This release restores and hardens the alert action surface and the config draft editor to their required fail-safe state, and removes a client-exposed Mother URL fallback from the server-only API layer. No Vite/Express code, no new features, no auth/session/RBAC/token/storage logic changes.

## Fixes in this release

### 1. Alert action confirmation flow (`app/(dashboard)/alerts/[alert_id]/`)
- `confirm/page.tsx` now supports `action=resolve`, `action=mute`, **and `action=unmute`** (previously only resolve/mute).
- `page.tsx` (alert detail) no longer executes `unmute` as an immediate, non-confirmed server action. Unmute now links to the same confirmation page as resolve/mute (`/alerts/[alert_id]/confirm?action=unmute`).
- Every action (resolve, mute, unmute) calls `requirePermission("alerts.manage")` **inside** the server action itself, not only at page render — permission is re-checked at the point of mutation.
- Every action attempt — success or failure — appends an audit event via `appendAudit` with actor, action name, target alert ID, and result.
- Redirect query statuses (`ok=`, `error=`) are validated against explicit whitelists (`KNOWN_OK`, `KNOWN_ERROR`) before being rendered; unrecognized values are dropped rather than displayed. No raw/free-form query text is rendered to the page.

### 2. `components/ConfigEditor.tsx` — fail-closed by construction
- Removed the `action` prop and the `<form action={...}>` submit wiring entirely — the component can no longer submit to any server action, regardless of how it is invoked.
- Removed the submit button; the "Save draft" control is now `<button type="button" disabled>` — inert by markup, not just by a runtime flag.
- The `agent_id` hidden field is `disabled` (non-submittable) and the component no longer renders a `<form>` element at all.
- Draft write/edit UI is unreachable: the component is read-only in all cases and is not currently wired into any page route.

### 3. `lib/api.ts` — server-only Mother access
- Removed the `NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL` fallback. The Mother base URL now resolves **only** from `UNIXSEE_MOTHER_BASE_URL`.
- `import "server-only"` remains in place — this module cannot be imported from client components.
- The Mother management token is never read into, or exposed to, browser-reachable code.

## Explicitly unchanged

- `lib/auth.ts`, `lib/rbac.ts`, `lib/user-store.ts` — no changes to authentication, session, RBAC, or token/storage logic.
- No Vite, Express, or any other bundler/server framework is present in this project.
- No test credentials (e.g. `admin` / `TestPass123!`) are committed to source. Test/bootstrap credentials, if used, are supplied only via Replit environment variables outside of this release source.
- Replit-only runtime accommodations (0.0.0.0/`$PORT` binding, dev-origin allowlist, writable user-store path, public base URL) remain confined to environment configuration and dev-only conditionals in `next.config.js` / `package.json` — none are hardcoded into canonical release behavior.

## Build

Verified with:
```
cd unixsee_campaign_gateway/dashboard
npm run build
```
Result: successful production build (Next.js 16.2.9, Turbopack), all routes compiled, TypeScript passed.
