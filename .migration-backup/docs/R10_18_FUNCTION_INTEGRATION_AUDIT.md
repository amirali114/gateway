# R10.18 Function / Data-Integration Audit
**Project:** Unixsee Campaign Gateway Dashboard  
**Source release:** R10.17  
**Audit release:** R10.18  
**Audit date:** 2026-07-04  
**Scope:** `unixsee_campaign_gateway/dashboard/lib/api.ts` — all exported functions, cross-referenced against every page in `app/(dashboard)/` plus login/logout routes.  
**Audit type:** Read-only code analysis. No backend implementation, no redesign, no runtime changes.

---

## 1. Inventory of All Exported Functions in `lib/api.ts`

### 1.1 Infrastructure / Helper Utilities

| Function | Signature | Purpose |
|---|---|---|
| `safeFetchJson` | `<T>(baseUrl, path, timeoutMs?) → ApiResult<T>` | Generic GET wrapper with 2.2 s AbortController timeout; returns `{ok,status,data}` or `{ok,status,error}` |
| `postMotherJson` | `<T>(path, body, timeoutMs?, actorHeaders?) → ApiResult<T>` | Generic POST wrapper; injects `Authorization: Bearer` from `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` env var |
| `read` | `<T>(result: ApiResult<T>) → T \| undefined` | Unwraps `ApiResult`; returns `undefined` on failure |
| `valueOrDash` | `(value: unknown) → string` | Renders `undefined/null/""` as `"—"`, booleans as `"enabled"/"disabled"` |
| `ltr` | `(value: unknown) → string` | Alias for `valueOrDash` |
| `asRecord` | `(value: unknown) → UnknownRecord` | Safe cast to `Record<string, unknown>` |
| `getNestedRecord` | `(record, key) → UnknownRecord` | Safe nested key access |
| `controlPlaneConfigFromForm` | `(formData: FormData) → object` | Serialises a form into a control-plane config shape (gateway/campaign/queue/bot/storage/security) |

### 1.2 Mother GET Functions (READ — `safeFetchJson` based)

| # | Function | Endpoint | Response Type |
|---|---|---|---|
| 1 | `getMotherHealth` | `GET /healthz` | `HealthResponse` |
| 2 | `getMotherReady` | `GET /readyz` | `ReadyResponse` |
| 3 | `getMotherPolicies` | `GET /v1/policies` | `MotherPoliciesResponse` |
| 4 | `getMotherPolicy` | `GET /v1/policies/:id` | `MotherPolicyResponse` |
| 5 | `getMotherDebugDefaultPolicy` | `GET /v1/debug/policies/default` | `UnknownRecord` |
| 6 | `getMotherAgents` | `GET /v1/agents` | `MotherAgentsResponse` |
| 7 | `getMotherAgent` | `GET /v1/agents/:id` | `MotherAgentResponse` |
| 8 | `getMotherAgentTelemetry` | `GET /v1/agents/:id/telemetry` | `MotherTelemetryResponse` |
| 9 | `getMotherAgentDiagnostics` | `GET /v1/agents/:id/diagnostics` | `MotherDiagnosticsResponse` |
| 10 | `getMotherAgentEvents` | `GET /v1/agents/:id/events` | `MotherEventsResponse` |
| 11 | `getMotherDiagnosticsSummary` | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |
| 12 | `getMotherStorageStatus` | `GET /v1/storage/status` | `MotherStorageStatusResponse` |
| 13 | `getMotherHealthReport` | `GET /v1/health/report` | `MotherHealthReportResponse` |
| 14 | `getMotherReleaseGates` | `GET /v1/release-gates` | `MotherReleaseGatesResponse` |
| 15 | `getMotherReleaseGateSummary` | `GET /v1/release-gates/summary` | `MotherReleaseGateSummary` |
| 16 | `getMotherAlerts` | `GET /v1/alerts[?status&agent_id&scope&limit]` | `MotherAlertsResponse` |
| 17 | `getMotherAlert` | `GET /v1/alerts/:id` | `MotherAlertResponse` |
| 18 | `getMotherAlertSummary` | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |
| 19 | `getMotherPolicyAssignment` | `GET /v1/agents/:id/policy-assignment` | `MotherPolicyAssignmentResponse` |
| 20 | `getMotherControlPlane` | `GET /v1/agents/:id/control-plane` | `MotherControlPlaneResponse` |
| 21 | `getMotherAgentConfig` | `GET /v1/agents/:id/config` | `MotherConfigResponse` |
| 22 | `getMotherAgentConfigHistory` | `GET /v1/agents/:id/config/history` | `MotherConfigHistoryResponse` |
| 23 | `getMotherAgentConfigDraft` | `GET /v1/agents/:id/config/draft` | `MotherConfigResponse` |
| 24 | `getMotherAgentConfigActive` | `GET /v1/agents/:id/config/active` | `MotherConfigResponse` |
| 25 | `getMotherAgentConfigDiff` | `GET /v1/agents/:id/config/diff` | `MotherConfigDiffResponse` |
| 26 | `getMotherAgentConfigVersions` | `GET /v1/agents/:id/config/versions` | `MotherConfigVersionsResponse` |

### 1.3 Mother POST Functions (WRITE — `postMotherJson` based)

| # | Function | Endpoint | Response Type | Requires Mgmt Token |
|---|---|---|---|---|
| 27 | `evaluateMotherAlerts` | `POST /v1/alerts/evaluate` | `{ok?,summary?}` | Yes |
| 28 | `resolveMotherAlert` | `POST /v1/alerts/:id/resolve` | `MotherAlertResponse` | Yes |
| 29 | `muteMotherAlert` | `POST /v1/alerts/:id/mute` | `MotherAlertResponse` | Yes |
| 30 | `unmuteMotherAlert` | `POST /v1/alerts/:id/unmute` | `MotherAlertResponse` | Yes |
| 31 | `validateMotherAgentConfig` | `POST /v1/agents/:id/config/validate` | `MotherConfigValidationResponse` | Yes |
| 32 | `publishMotherAgentConfig` | `POST /v1/agents/:id/config/publish` | `MotherConfigResponse` | Yes |
| 33 | `rollbackMotherAgentConfig` | `POST /v1/agents/:id/config/rollback` | `MotherConfigResponse` | Yes |

---

## 2. Page-by-Page Function Call Audit

### 2.1 `/` — Home / Dashboard Overview
**Route:** `app/(dashboard)/page.tsx`  
**Permission guard:** `dashboard.view`  
**Data source:** `lib/dashboard/server-data.ts` and `lib/dashboard/mappers.ts`

| Function called | Where used in page | Integration status |
|---|---|---|
| `getMotherHealth` | Via `server-data.ts` → hero KPI | ✅ Active |
| `getMotherReady` | Via `server-data.ts` → storage engine | ✅ Active |
| `getMotherAgents` | Via `server-data.ts` → agent count, fleet status | ✅ Active |
| `getMotherDiagnosticsSummary` | Via `server-data.ts` → telemetry stats | ✅ Active |
| `getMotherAlerts` | Via `server-data.ts` → alert counts | ✅ Active |
| `getMotherStorageStatus` | Via `server-data.ts` → storage posture | ✅ Active |
| `getMotherReleaseGates` | Via `server-data.ts` → release readiness strip | ✅ Active |

### 2.2 `/agents` — Agent Registry
**Route:** `app/(dashboard)/agents/page.tsx`  
**Permission guard:** `agents.view`

| Function called | Integration status |
|---|---|
| `getMotherAgents` | ✅ Active — fleet list, KPIs, per-agent rows |
| `getMotherDiagnosticsSummary` | ✅ Active — fresh/stale/missing telemetry KPIs |

### 2.3 `/agents/[agent_id]` — Agent Detail
**Route:** `app/(dashboard)/agents/[agent_id]/page.tsx`  
**Permission guard:** `agents.view`

| Function called | Integration status |
|---|---|
| `getMotherAgent` | ✅ Active — agent identity, status, last-seen |
| `getMotherPolicyAssignment` | ✅ Active — assignment status pill |
| `getMotherControlPlane` | ✅ Active — active config fallback |
| `getMotherAgentConfig` | ✅ Active — active/draft config panel |
| `getMotherAgentConfigHistory` | ✅ Active — passed to RawJsonDrawer |
| `getMotherAgentConfigVersions` | ✅ Active — versions table |
| `getMotherAgentTelemetry` | ✅ Active — telemetry posture card |
| `getMotherAgentDiagnostics` | ✅ Active — passed to RawJsonDrawer |
| `getMotherAgentEvents` | ✅ Active — events table (capped at 12 rows) |
| `getMotherAlerts` | ✅ Active — agent-scoped alerts table |

### 2.4 `/alerts` — Fleet Alerts
**Route:** `app/(dashboard)/alerts/page.tsx`  
**Permission guard:** `alerts.view`

| Function called | Integration status |
|---|---|
| `getMotherAlerts` | ✅ Active — main alert list with query params (status, scope, agent, limit) |
| `getMotherAlertSummary` | ✅ Active — severity KPI cards |

### 2.5 `/diagnostics` — Diagnostics
**Route:** `app/(dashboard)/diagnostics/page.tsx`  
**Permission guard:** `diagnostics.view`

| Function called | Integration status |
|---|---|
| `getMotherHealth` | ✅ Active — health KPI card |
| `getMotherReady` | ✅ Active — ready KPI card |
| `getMotherAgents` | ✅ Active — agent diagnostics snapshot table |
| `getMotherDiagnosticsSummary` | ✅ Active — match rate, telemetry fresh/stale/missing, config rollout posture |
| `getMotherStorageStatus` | ✅ Active — storage detail section |
| `getMotherAlertSummary` | ✅ Active — alert severity breakdown |
| `getMotherHealthReport` | ✅ Active — release safety signals (backup, shadow, exposure, critical events) |

### 2.6 `/gateway` — Gateway Control
**Route:** `app/(dashboard)/gateway/page.tsx`  
**Permission guard:** `gateway.view`

| Function called | Integration status |
|---|---|
| `getMotherAgents` | ✅ Active — agent selector list |
| `getMotherAgentConfig` | ✅ Active — active/draft config display |
| `getMotherAgentConfigDiff` | ✅ Active — dirty flag + diff drawer |
| `getMotherAgentConfigVersions` | ✅ Active — versions history table |

### 2.7 `/mother` — Mother Core
**Route:** `app/(dashboard)/mother/page.tsx`  
**Permission guard:** `settings.view`

| Function called | Integration status |
|---|---|
| `getMotherHealth` | ✅ Active — health KPI + status table |
| `getMotherReady` | ✅ Active — ready KPI + policy source/status |
| `getMotherPolicy("default")` | ✅ Active — default policy section |
| `getMotherDiagnosticsSummary` | ✅ Active — registered agents count |
| `getMotherStorageStatus` | ✅ Active — storage detail section |

### 2.8 `/policy` — Policy Sync
**Route:** `app/(dashboard)/policy/page.tsx`  
**Permission guard:** `policy.view`

| Function called | Integration status |
|---|---|
| `getMotherPolicies` | ✅ Active — policy catalog table |
| `getMotherPolicy("default")` | ✅ Active — default policy hero panel |
| `getMotherReady` | ✅ Active — policy sync state |
| `getMotherDiagnosticsSummary` | ✅ Active — configs pending/stale rollout posture |

### 2.9 `/release` — Release Readiness
**Route:** `app/(dashboard)/release/page.tsx`  
**Permission guard:** `release.view`

| Function called | Integration status |
|---|---|
| `getMotherReleaseGates` | ✅ Active — gate panel, blocker list, go/no-go summary |
| `getMotherHealthReport` | ✅ Active — backup/shadow/exposure/critical events posture |
| `getMotherAlerts` | ✅ Active — active alerts affecting release confidence |
| `getMotherDiagnosticsSummary` | ✅ Active — telemetry freshness for release posture |

### 2.10 `/settings` — Mother Settings
**Route:** `app/(dashboard)/settings/page.tsx`  
**Permission guard:** `settings.view`  
**Additional source:** `dashboardSecuritySummary()` from `lib/auth.ts`

| Function called | Integration status |
|---|---|
| `getMotherHealth` | ✅ Active — health KPI |
| `getMotherReady` | ✅ Active — ready KPI |
| `getMotherPolicies` | ✅ Active — policies synced count + policy table |
| `getMotherStorageStatus` | ✅ Active — storage posture |
| `dashboardSecuritySummary` | ✅ Active — auth/secret/token/trust-proxy/user-store posture |

### 2.11 `/settings/production` — Production Readiness
**Route:** `app/(dashboard)/settings/production/page.tsx`  
**Permission guard:** `settings.view`

| Function called | Integration status |
|---|---|
| `getMotherStorageStatus` | ✅ Active — storage writable check |
| `getMotherDiagnosticsSummary` | ✅ Active — telemetry freshness check |
| `getMotherAgents` | ✅ Active — agent count check |
| `getMotherHealthReport` | ✅ Active — passed to RawJsonDrawer |
| `dashboardSecuritySummary` | ✅ Active — management token configured check |

### 2.12 `/sync` — Policy Sync Visibility
**Route:** `app/(dashboard)/sync/page.tsx`  
**Permission guard:** `agents.view`

| Function called | Integration status |
|---|---|
| `getMotherAgents` | ✅ Active — sync state per agent, pull count, version, ack timestamps |

### 2.13 `/users` — Users & RBAC
**Route:** `app/(dashboard)/users/page.tsx`  
**Permission guard:** `users.view`  
**Data source:** `lib/user-store.ts` (local file store — no Mother API calls)

| Function called | Integration status |
|---|---|
| `listUsers` (user-store) | ✅ Active — user table |
| `createUser` (user-store) | ✅ Active — Server Action, `users.manage` guard |
| `updateUser` (user-store) | ✅ Active — Server Action, `users.manage` guard |
| `resetUserPassword` (user-store) | ✅ Active — Server Action, `users.manage` guard |

### 2.14 `/audit` — Audit Trail
**Route:** `app/(dashboard)/audit/page.tsx`  
**Permission guard:** `audit.view`  
**Data source:** `lib/user-store.ts` (local file store — no Mother API calls)

| Function called | Integration status |
|---|---|
| `listAuditEvents` (user-store) | ✅ Active — events table, capped at 300 rows, filterable |

### 2.15 Login / Logout
**Routes:** `app/login/` and `app/logout/route.ts`  
**Data source:** `lib/auth.ts`

| Function called | Integration status |
|---|---|
| `currentSession` (auth) | ✅ Active — session cookie validation |
| `signIn` / `signOut` (auth actions) | ✅ Active — HMAC session token create/clear |

---

## 3. Functions NOT Called by Any Page

The following functions are exported from `lib/api.ts` but are **not called by any current dashboard page** (server component or server action):

| # | Function | Endpoint | Reason not called |
|---|---|---|---|
| **F-01** | `getMotherDebugDefaultPolicy` | `GET /v1/debug/policies/default` | Debug endpoint; no page renders it. Likely a development probe left in `api.ts`. |
| **F-02** | `getMotherAlert` (single) | `GET /v1/alerts/:id` | Alerts page uses the list endpoint only; no alert-detail page exists. |
| **F-03** | `getMotherReleaseGateSummary` | `GET /v1/release-gates/summary` | Release page uses `getMotherReleaseGates` (which includes a `summary` field); this dedicated summary endpoint is unused. |
| **F-04** | `evaluateMotherAlerts` | `POST /v1/alerts/evaluate` | No UI control triggers alert evaluation. |
| **F-05** | `resolveMotherAlert` | `POST /v1/alerts/:id/resolve` | Alert management actions are intentionally not exposed in the UI (read-only posture). |
| **F-06** | `muteMotherAlert` | `POST /v1/alerts/:id/mute` | Same as above. |
| **F-07** | `unmuteMotherAlert` | `POST /v1/alerts/:id/unmute` | Same as above. |
| **F-08** | `getMotherAgentConfigDraft` | `GET /v1/agents/:id/config/draft` | Draft config is accessed through `getMotherAgentConfig` (which returns both `active_config` and `draft_config` in one response). The dedicated draft endpoint is redundant. |
| **F-09** | `getMotherAgentConfigActive` | `GET /v1/agents/:id/config/active` | Same rationale — the unified `config` endpoint satisfies both. |
| **F-10** | `validateMotherAgentConfig` | `POST /v1/agents/:id/config/validate` | No config-editor or form exists to trigger validation. |
| **F-11** | `publishMotherAgentConfig` | `POST /v1/agents/:id/config/publish` | Publish control is intentionally absent. Dashboard is read-only for config management. |
| **F-12** | `rollbackMotherAgentConfig` | `POST /v1/agents/:id/config/rollback` | Rollback control is intentionally absent. Documented in multiple pages as "not exposed." |
| **F-13** | `controlPlaneConfigFromForm` | *(form helper, no HTTP call)* | No form page exists that submits a control-plane config. The helper is defined but has no consumer. |

**Summary:** 13 of 33 exported symbols (39%) are currently uncalled. All uncalled write functions (F-04 through F-12) are intentionally absent per the read-only safety posture stated in every page's readonly-banner. The two uncalled GET functions (F-01, F-03) are minor redundancies (debug probe and duplicate summary endpoint). The form helper (F-13) is dead utility code.

---

## 4. Uncalled Functions — Risk Classification

| ID | Risk | Classification | Recommendation |
|---|---|---|---|
| F-01 | `getMotherDebugDefaultPolicy` | **Low** — read-only debug probe | Keep or remove; no safety impact |
| F-02 | `getMotherAlert` (single) | **Low** — GET, no side effects | Needed when/if an alert-detail page is added |
| F-03 | `getMotherReleaseGateSummary` | **Low** — read-only, redundant | Remove or defer to a future gates-summary panel |
| F-04 | `evaluateMotherAlerts` | **Medium** — POST with side effects | Guard with explicit permission before any future exposure |
| F-05 | `resolveMotherAlert` | **Medium** — POST with side effects | Gate on `alerts.manage` permission; log to audit trail |
| F-06 | `muteMotherAlert` | **Medium** — POST with side effects | Gate on `alerts.manage` permission; log to audit trail |
| F-07 | `unmuteMotherAlert` | **Medium** — POST with side effects | Gate on `alerts.manage` permission; log to audit trail |
| F-08 | `getMotherAgentConfigDraft` | **Low** — GET, redundant | Remove or keep for explicit draft-only fetch |
| F-09 | `getMotherAgentConfigActive` | **Low** — GET, redundant | Remove or keep for explicit active-only fetch |
| F-10 | `validateMotherAgentConfig` | **Low** — POST but non-mutating | Safe to expose if a config editor is added |
| F-11 | `publishMotherAgentConfig` | **High** — mutates fleet config | Must require `gateway.config.publish` permission + audit log |
| F-12 | `rollbackMotherAgentConfig` | **High** — mutates fleet config | Must require `gateway.config.rollback` permission + audit log |
| F-13 | `controlPlaneConfigFromForm` | **Low** — pure form helper | Can be removed; no consumer exists |

---

## 5. RBAC Permission Coverage

All pages enforce `requirePermission()` at the top of the server component. The following permission-to-page mapping was confirmed:

| Permission | Pages enforced |
|---|---|
| `dashboard.view` | `/` (home) |
| `agents.view` | `/agents`, `/agents/[agent_id]`, `/sync` |
| `alerts.view` | `/alerts` |
| `diagnostics.view` | `/diagnostics` |
| `gateway.view` | `/gateway` |
| `policy.view` | `/policy` |
| `release.view` | `/release` |
| `settings.view` | `/mother`, `/settings`, `/settings/production` |
| `users.view` | `/users` |
| `users.manage` | `/users` — create/update/reset Server Actions |
| `audit.view` | `/audit` |

**Gap:** The RBAC matrix in `lib/rbac.ts` defines 15 permissions. Among them, `alerts.manage`, `gateway.config.publish`, `gateway.config.rollback`, and `gateway.config.validate` are defined but have **no page** or server action that checks them. These are permissions awaiting UI exposure for the write-side functions (F-04 through F-12).

---

## 6. Data Freshness Strategy

All server components use `export const dynamic = "force-dynamic"`. Every page load triggers fresh server-side fetches to the Mother API — there is no client-side caching, no SWR polling, and no stale-while-revalidate. This is intentional: the dashboard is a local-network operational tool expected to have low traffic volume.

- **Timeout:** 2,200 ms per fetch (AbortController)
- **On timeout/error:** `ApiResult<T>` returns `{ok: false, error: "Request timed out" | message}`. Pages render gracefully with `ErrorState` or `EmptyState` components.
- **Token handling:** `UNIXSEE_MOTHER_MANAGEMENT_TOKEN` is injected server-side only via `postMotherJson`. GET calls do not use the token. The browser never receives the token.

---

## 7. `lib/dashboard/server-data.ts` and `mappers.ts`

These files serve the home page (`/`). They aggregate data from multiple Mother endpoints into typed dashboard-summary objects. The mappers transform raw API responses into display-ready structures (KPI counts, fleet status labels, release-gate summaries). Both files are consumed exclusively by the home page server component; no other page imports them.

---

## 8. Summary Statistics

| Category | Count |
|---|---|
| Total exported symbols in `lib/api.ts` | 33 |
| Infrastructure/helpers (non-HTTP) | 7 |
| Mother GET functions | 19 |
| Mother POST functions | 7 |
| **Called by at least one page** | **20** |
| **Not called by any page** | **13** |
| Pages audited | 15 (13 dashboard + login + logout) |
| Pages with 100% live Mother API data (no mocks) | 13 |
| Pages with local user-store only (no Mother calls) | 2 (`/users`, `/audit`) |
| Write functions with no UI exposure (intentional) | 7 (F-04–F-12 minus F-08, F-09, F-13) |
| Write functions defined but have no permission guard in any page | 4 (`alerts.manage`, `gateway.config.publish`, `gateway.config.rollback`, `gateway.config.validate`) |

---

## 9. Integration Gaps — R10.18 Recommendations

The following are gaps identified for future releases. **None are required to unblock R10.18.**

| Gap ID | Description | Priority |
|---|---|---|
| GAP-01 | Alert management UI (resolve / mute / unmute) — functions ready, no page exists | Medium |
| GAP-02 | Alert detail page — `getMotherAlert` (single) is ready, no route exists | Low |
| GAP-03 | Config editor + publish/rollback workflow — functions and permissions defined, no UI | High (future milestone) |
| GAP-04 | `getMotherDebugDefaultPolicy` — debug probe, no consumer; remove or gate behind debug flag | Low |
| GAP-05 | `getMotherReleaseGateSummary` — dedicated summary endpoint unused; release page uses the combined gates endpoint | Low |
| GAP-06 | `controlPlaneConfigFromForm` — dead utility; no form page consumes it | Low |
| GAP-07 | `getMotherAgentConfigDraft` and `getMotherAgentConfigActive` — redundant with unified config endpoint | Low |

---

*End of audit. Document covers R10.17 source only. No code was modified during this audit.*
