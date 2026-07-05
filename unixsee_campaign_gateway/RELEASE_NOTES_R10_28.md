# R10.28 — Live Data / Agent Registration Verification (Read-Only Audit)

## Scope

This release is a **read-only diagnostic audit**. No UI redesign, no new features, no code changes to Mother/Agent/PHP Gateway, no auth/session/RBAC/token/storage changes, no enforcement, no remote commands, no install-core/deploy automation. **No dashboard source files were modified in this release** — see "Changed files" below.

## Why the Dashboard can show "Mother healthy" but "0 agents"

These are two independent signals, fetched from two independent Mother endpoints, and the dashboard treats them correctly as independent:

- **"Mother healthy"** comes from `GET /healthz` (`getMotherHealth()` in `lib/api.ts`) — this only proves the Mother process is up and responding to its liveness probe. It says nothing about registry contents.
- **"0/0 agents online"** and **"No agents registered yet"** come from `GET /v1/agents` (`getMotherAgents()`), which the Overview and Agents pages read via `read(agentsResult)?.agents || []`. This defaults to an empty array whenever the field is missing, the request failed, or the array is genuinely empty — so a healthy Mother with an empty or malformed agent-list response looks identical to a healthy Mother with zero real agents, **from the dashboard's point of view**.

Both signals being independently truthful is expected: a fresh Mother deployment is commonly healthy on `/healthz` immediately at boot, before any Agent has ever registered.

## What was inspected (dashboard side — fully verifiable in this repo)

| Area | Finding |
|---|---|
| `app/(dashboard)/page.tsx` | Reads `overview.agents.items` (from `getDashboardOverview()`); shows `EmptyState` "No agents registered yet" when the array is empty. No unguarded access. |
| `app/(dashboard)/agents/page.tsx` | Reads `getMotherAgents()` directly; distinguishes `agentsResult.ok === false` ("Unavailable"/`ErrorState`) from `agentsResult.ok === true && agents.length === 0` ("Empty registry"/onboarding checklist). Already has a "Raw Mother registry" `RawJsonDrawer` showing the exact raw JSON Mother returned. |
| `app/(dashboard)/agents/[agent_id]/page.tsx` | Reads `getMotherAgent(agentId)`; renders "Agent unavailable" with the raw error payload when Mother returns not-ok. |
| `app/(dashboard)/gateway/page.tsx` | Reads `getMotherAgents()` to populate the agent selector; empty registry results in no agent selectable, which is expected and already null-safe (fixed in R10.27). |
| `lib/api.ts` | All Mother calls go through `safeFetchJson`, which is server-only, never exposes the Mother token to the browser, and always returns a defined `ApiResult` (`{ ok, data }` or `{ ok: false, error }`) — no raw `fetch` is exposed to client code. |
| `lib/types.ts` | Defines the exact response shape the dashboard expects: `MotherAgentsResponse = { ok?: boolean; agents?: MotherAgentRecord[] }` for `GET /v1/agents`. |

## Expected Mother endpoints (per dashboard contract in `lib/api.ts`)

| Purpose | Endpoint | Expected shape |
|---|---|---|
| Health | `GET /healthz` | `{ ok, service, mode }` |
| Readiness | `GET /readyz` | `{ ok, storage, storage_engine }` |
| Agent registry (list) | `GET /v1/agents` | `{ ok, agents: MotherAgentRecord[] }` |
| Agent detail | `GET /v1/agents/{id}` | `{ ok, agent, policy_assignment, active_config, draft_config }` |
| Agent telemetry | `GET /v1/agents/{id}/telemetry` | `{ ok, agent_id, telemetry }` |
| Agent diagnostics | `GET /v1/agents/{id}/diagnostics` | `{ ok, diagnostics: { telemetry, events } }` |
| Diagnostics summary (fleet) | `GET /v1/diagnostics/summary` | `{ ok, summary: { total_agents, online_agents, ... } }` |
| Policy sync / assignment | `GET /v1/agents/{id}/policy-assignment` | `{ ok, agent_id, assigned, policy_id }` |
| Gateway config (active/draft/diff/versions) | `GET /v1/agents/{id}/config[...]` | `{ ok, active_config, draft_config }` / diff / versions variants |
| Alert summary | `GET /v1/alerts/summary` | `{ ok, active_total, critical, warn, ... }` |
| Release gate summary | `GET /v1/release-gates/summary` | `MotherReleaseGateSummary` |
| Storage status | `GET /v1/storage/status` | `MotherStorageStatusResponse` |

**Whether Mother actually implements these with these exact field names cannot be verified from this repository** — the Mother (Go) source code and Agent (Go) source code are not present anywhere in this workspace. Only the Next.js dashboard exists here. Confirming the live response shape requires either inspecting the Mother codebase directly, or observing its live output (see "Recommended next step" below).

## Agent registration path

Not verifiable from this repo — no Go Agent or Mother source exists here to inspect. The dashboard's own onboarding copy (already present in `app/(dashboard)/agents/page.tsx`, unchanged) documents the expected flow: an Agent is expected to register itself automatically with Mother on its **first policy pull or telemetry push** — there is no separate "explicit registration" call initiated from the dashboard, and the dashboard never writes to the registry.

## Storage

Not verifiable from this repo — no Mother JSON storage schema or state file is present in this workspace to inspect.

## Diagnosis

Given the available evidence (healthy `/healthz`, no runtime errors, empty registry, dashboard code confirmed contract-correct), the most consistent explanation is:

**(a) No Agent has registered with this Mother instance yet** — a fresh/newly-deployed Mother is expected to report healthy immediately while its registry is still empty, until at least one Agent completes its first policy pull or telemetry push.

This cannot be fully distinguished from **(c) a field-name mismatch between what Mother returns and what the dashboard expects** without seeing Mother's actual live response body, since a mismatch (e.g. Mother returning `{ ok: true, data: { agents: [...] } }` instead of `{ ok: true, agents: [...] }`) would look identical to a genuinely empty registry from the dashboard's UI — both fall through the same `read(agentsResult)?.agents || []` default.

**(b) endpoint mismatch, (d) storage not persisting, (e) deployment/config issue** are less likely given Mother reports healthy and no dashboard-side fetch errors were observed, but cannot be ruled out without Mother-side access.

## Recommended next step (no code change required)

The dashboard already ships a zero-risk, read-only diagnostic for this exact question: open `/agents` in the deployed dashboard and expand the **"Raw Mother registry"** panel at the bottom of the page. This shows the *exact* raw JSON body Mother returned for `GET /v1/agents`:

- If it shows `{ "ok": true, "agents": [] }` → confirms case (a), no agent has registered yet. No dashboard fix needed; wait for an Agent's first policy pull/telemetry push.
- If it shows a differently-shaped object (e.g. `agents` nested under another key, or missing `ok`) → confirms case (c), a small dashboard-side field-mapping fix would be warranted (would be scoped as its own follow-up release, since it touches `lib/types.ts`/`lib/api.ts` parsing).
- If it shows an error object (`{ "ok": false, "error": ... }`) → indicates case (b), (d), or (e), and requires Mother/Agent-side investigation, not a dashboard change.

## Conclusion

**This is a diagnostic-only release. No dashboard code was changed.** The dashboard's data-fetch paths, type contracts, and empty-state handling for the agent registry are confirmed correct and already null-safe. The root cause of the empty registry lives outside this repository (Mother/Agent runtime or deployment configuration) and requires the raw-registry check above, or direct Mother/Agent-side inspection, to resolve definitively.

## Safety checklist (re-verified, unchanged)

- Alert resolve/mute/unmute still require confirmation via `/alerts/[alert_id]/confirm`.
- `components/ConfigEditor.tsx` remains unused and fail-closed (`<button type="button" disabled>`).
- `lib/api.ts` still imports `server-only`.
- `NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL` does not exist anywhere in the codebase.
- `package.json` `dev`/`start` scripts still bind only to `127.0.0.1:8740`.
- `next.config.js` has no Replit iframe/dev-origin exceptions.
- `X-Frame-Options: DENY` remains unconditional.
- No Vite, Express, `pages/`, `lib/mock-data.ts`, or inference-worker/embedding/GPU/model-manager terms present.

## Changed files

None. This release adds only this document (`RELEASE_NOTES_R10_28.md`) on top of the R10.27 baseline; the dashboard source is byte-for-byte identical to R10.27.
