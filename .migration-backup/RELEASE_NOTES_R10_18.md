# Release Notes — R10.18
**Project:** Unixsee Campaign Gateway Dashboard  
**Release:** R10.18  
**Date:** 2026-07-04  
**Base:** R10.17 (Next.js 16, React 19, TypeScript 6)  
**Scope:** Audit-only release. No code changes were made to `unixsee_campaign_gateway/dashboard`. R10.18 documents the function / data-integration posture of the R10.17 codebase.

---

## What's New in R10.18

### 1. Function / Data-Integration Audit (`docs/R10_18_FUNCTION_INTEGRATION_AUDIT.md`)

A full read-only audit of every exported function in `lib/api.ts` was performed and cross-referenced against all 15 dashboard pages (13 dashboard routes + login + logout).

**Key findings:**

- **33 total exported symbols** in `lib/api.ts` (7 helpers, 19 GET functions, 7 POST functions).
- **20 of 33 symbols are actively called** by at least one page on every request.
- **13 symbols are currently uncalled** — all are intentionally absent from the UI per the read-only safety posture.
- **All 13 dashboard pages load exclusively from the live Mother API** — no mock data, no placeholder stubs. Two pages (`/users`, `/audit`) use the local file-based user store only and make no Mother API calls.
- **All write functions** (`resolveMotherAlert`, `muteMotherAlert`, `unmuteMotherAlert`, `evaluateMotherAlerts`, `publishMotherAgentConfig`, `rollbackMotherAgentConfig`, `validateMotherAgentConfig`) are defined but have **no UI surface** — consistent with the dashboard's read-only-first controlled-beta posture.
- **4 RBAC permissions** defined in `lib/rbac.ts` (`alerts.manage`, `gateway.config.publish`, `gateway.config.rollback`, `gateway.config.validate`) have no corresponding page or server action in R10.17 — they are forward stubs for the write-side features.
- **7 integration gaps** (GAP-01 through GAP-07) were catalogued. None block R10.18.

### 2. Dashboard Ported to Replit

The R10.17 Next.js dashboard source was extracted from the release ZIP and installed at `unixsee_campaign_gateway/dashboard/` in the Replit workspace. A production build (`npm run build`) was executed against the real Next.js 16 source to confirm no build errors.

---

## Changes from R10.17

R10.18 is a **no-change, audit-only release**. The following items were unchanged:

| Item | Status |
|---|---|
| `unixsee_campaign_gateway/dashboard/` source | Unchanged (exact R10.17 copy) |
| `lib/api.ts` | Unchanged |
| `lib/auth.ts` | Unchanged |
| `lib/rbac.ts` | Unchanged |
| `lib/user-store.ts` | Unchanged |
| `lib/types.ts` | Unchanged |
| All page server components | Unchanged |
| All components | Unchanged |
| `middleware.ts` | Unchanged |

**New artifacts added in R10.18:**

| File | Description |
|---|---|
| `docs/R10_18_FUNCTION_INTEGRATION_AUDIT.md` | Full function/data-integration audit |
| `RELEASE_NOTES_R10_18.md` | This file |
| `unixsee_campaign_gateway-r10.18-function-integration-audit.zip` | Release ZIP (source + audit docs) |

---

## Environment Requirements (unchanged from R10.17)

| Variable | Required | Description |
|---|---|---|
| `DASHBOARD_SESSION_SECRET` | Yes (≥32 chars) | HMAC-SHA256 session signing key |
| `UNIXSEE_MOTHER_BASE_URL` | Recommended | Mother API base (default: `http://127.0.0.1:8732`) |
| `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` | Yes (for write ops) | Bearer token for POST endpoints (currently no UI; server-side only) |
| `DASHBOARD_BOOTSTRAP_ADMIN_USERNAME` | Recommended | Seed the initial admin account |
| `DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH` | Recommended | bcrypt hash for the seed admin account |
| `DASHBOARD_USER_STORE_PATH` | Optional | User/audit JSONL storage directory (default: `/var/lib/unixsee-gateway/dashboard`) |
| `DASHBOARD_DISABLE_AUTH` | Optional | `"1"` disables auth (development only) |
| `TRUST_PROXY` | Optional | `"1"` trusts `X-Forwarded-For` headers |

---

## Safety Posture Confirmed (R10.17 → R10.18)

| Safety property | Status |
|---|---|
| No mock or placeholder data in any production page | ✅ Confirmed |
| All pages force-dynamic (no stale cache) | ✅ Confirmed |
| Mother management token never delivered to browser | ✅ Confirmed |
| All write functions absent from UI | ✅ Confirmed |
| All pages gated by `requirePermission()` | ✅ Confirmed |
| Audit trail appends to JSONL, no delete control exposed | ✅ Confirmed |
| IP and user-agent hashed before audit storage | ✅ Confirmed |
| No enforcement or remote-command capability | ✅ Confirmed |

---

## Known Limitations (carried from R10.17)

- Alert management (resolve / mute / unmute) is implemented in `lib/api.ts` but has no UI page — intentional for R10.17/R10.18 controlled beta.
- Config publish and rollback are implemented in `lib/api.ts` but have no UI surface — intentional.
- No alert-detail page exists; the single-alert GET function (`getMotherAlert`) is not yet consumed.
- The debug policy endpoint (`getMotherDebugDefaultPolicy`) and the dedicated release-gate summary endpoint (`getMotherReleaseGateSummary`) are defined but unused.

---

## Next Steps (post-R10.18)

| Priority | Task |
|---|---|
| High | Alert management UI — expose resolve/mute/unmute behind `alerts.manage` permission with audit logging |
| High | Config publish/rollback workflow — editor page, validation step, `gateway.config.publish` / `gateway.config.rollback` guards |
| Medium | Alert detail page — single-alert view |
| Low | Clean up dead code: `getMotherDebugDefaultPolicy`, `getMotherReleaseGateSummary`, `controlPlaneConfigFromForm`, redundant draft/active config endpoints |

---

*R10.18 is a stable audit snapshot. The dashboard source is unchanged from R10.17.*
