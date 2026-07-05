---
name: Next.js apps on Replit artifacts
description: How to run a real Next.js App Router app (not Vite/Express) as a Replit artifact, and pitfalls behind the preview proxy.
---

## Artifact registration
- There is no built-in Next.js artifact skill/scaffold; register it as a generic `kind = "web"` artifact and hand-edit `.replit-artifact/artifact.toml` (via `verifyAndReplaceArtifactToml`) to run `npm run dev` / `npm run build` / `npm run start` instead of Vite commands. Keep the required `[[integratedSkills]]` block present or validation fails, even if its `name` (e.g. `react-vite`) doesn't literally match.
- If an old artifact previously claimed the same `previewPath`, its stale `.replit-artifact/` registration must be removed or the new one won't take effect — check for conflicting previewPath registrations across the workspace (including any `.migration-backup/artifacts/*`).

## Dev server config
- Bind Next.js to `-H 0.0.0.0 -p $PORT` (not `127.0.0.1` / hardcoded port) so the Replit proxy can reach it.
- In dev, disable `X-Frame-Options: DENY` (breaks the preview iframe) and set `allowedDevOrigins` to the Replit dev domain patterns (`*.replit.dev`, `*.repl.co`, `process.env.REPLIT_DEV_DOMAIN`) or Next.js blocks cross-origin `/_next/webpack-hmr` requests from the proxied origin.

## Absolute-URL redirects break behind the proxy
- Any server code building an absolute redirect URL from `req.url` (e.g. `NextResponse.redirect(new URL("/x", req.url))`) can resolve to the raw bind address (`0.0.0.0:<port>`) instead of the real public domain, because Next.js derives it from the bind host in this dev setup, not the incoming Host header. Browser then gets `ERR_SSL_PROTOCOL_ERROR` trying to hit that literal address.
- Fix by setting an app-level public-base-URL env var (if the app supports one) to `https://$REPLIT_DEV_DOMAIN`, rather than patching route code — check first whether the app already has this knob (many session/auth libs do, e.g. for secure-cookie detection too) before changing redirect logic.

## Default file-based storage paths often aren't writable
- Apps that default to system paths like `/var/lib/<app>` for local JSON/user stores will silently fail to persist (bootstrap admin user never gets created) in the Replit sandbox, since `runner` can't write to `/var/lib`. Symptom: login always fails with no visible error. Fix via the app's own storage-path env var, pointed at a writable workspace directory — not a code change.

## Defensive null-handling from prior migration work
- `read(x!)`-style TypeScript non-null assertions on an `ApiResult | undefined` don't prevent runtime crashes — if the value is genuinely `undefined` at runtime (e.g. a conditional `Promise.all` branch that produces `undefined` when a precondition like "no agents available" isn't met), it crashes with "Cannot read properties of undefined". Making the shared `read()` helper itself accept `| undefined` and short-circuit is a safe, non-behavioral fix (same output when the value is present) — apply it centrally rather than patching every call site.
