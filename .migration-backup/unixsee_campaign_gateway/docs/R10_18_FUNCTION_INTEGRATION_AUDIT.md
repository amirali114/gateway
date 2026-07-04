# R10.18 — Function / Data Integration Audit

**Date:** 2026-07-04  
**Release:** R10.18  
**Scope:** Read-only integration audit of 11 dashboard pages against the Mother API surface.  
No code was changed in this release beyond the audit document itself.

---

## Audit methodology

Every page was read at the source level. For each page the following was cross-referenced:

- **UI sections rendered** — what the browser actually shows
- **Server-side API calls** — which functions in `lib/api.ts` are called
- **Mother endpoint hit** — the actual HTTP endpoint invoked
- **Type used** — the TypeScript interface from `lib/types.ts`
- **Agent telemetry fields** — which `MotherAgentRecord` / `MotherTelemetryRecord` fields are surfaced
- **Gap analysis** — data available in existing API responses that is not rendered
- **Functions in `lib/api.ts` available but not called** on that page
- **Backend changes required** — whether new Mother endpoints or new `lib/api.ts` wrappers are needed
- **Safety risk** — what could go wrong if the gap were filled incorrectly

---

## API surface inventory

### GET endpoints (server-side only, in `lib/api.ts`)

| Function | Mother endpoint | Type returned |
|---|---|---|
| `getMotherHealth()` | `GET /healthz` | `HealthResponse` |
| `getMotherReady()` | `GET /readyz` | `ReadyResponse` |
| `getMotherPolicies()` | `GET /v1/policies` | `MotherPoliciesResponse` |
| `getMotherPolicy(id)` | `GET /v1/policies/:id` | `MotherPolicyResponse` |
| `getMotherDebugDefaultPolicy()` | `GET /v1/debug/policies/default` | `UnknownRecord` |
| `getMotherAgents()` | `GET /v1/agents` | `MotherAgentsResponse` |
| `getMotherAgent(id)` | `GET /v1/agents/:id` | `MotherAgentResponse` |
| `getMotherAgentTelemetry(id)` | `GET /v1/agents/:id/telemetry` | `MotherTelemetryResponse` |
| `getMotherAgentDiagnostics(id)` | `GET /v1/agents/:id/diagnostics` | `MotherDiagnosticsResponse` |
| `getMotherAgentEvents(id)` | `GET /v1/agents/:id/events` | `MotherEventsResponse` |
| `getMotherPolicyAssignment(id)` | `GET /v1/agents/:id/policy-assignment` | `MotherPolicyAssignmentResponse` |
| `getMotherControlPlane(id)` | `GET /v1/agents/:id/control-plane` | `MotherControlPlaneResponse` |
| `getMotherAgentConfig(id)` | `GET /v1/agents/:id/config` | `MotherConfigResponse` |
| `getMotherAgentConfigDraft(id)` | `GET /v1/agents/:id/config/draft` | `MotherConfigResponse` |
| `getMotherAgentConfigActive(id)` | `GET /v1/agents/:id/config/active` | `MotherConfigResponse` |
| `getMotherAgentConfigHistory(id)` | `GET /v1/agents/:id/config/history` | `MotherConfigHistoryResponse` |
| `getMotherAgentConfigDiff(id)` | `GET /v1/agents/:id/config/diff` | `MotherConfigDiffResponse` |
| `getMotherAgentConfigVersions(id)` | `GET /v1/agents/:id/config/versions` | `MotherConfigVersionsResponse` |
| `getMotherDiagnosticsSummary()` | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |
| `getMotherStorageStatus()` | `GET /v1/storage/status` | `MotherStorageStatusResponse` |
| `getMotherHealthReport()` | `GET /v1/health/report` | `MotherHealthReportResponse` |
| `getMotherReleaseGates()` | `GET /v1/release-gates` | `MotherReleaseGatesResponse` |
| `getMotherReleaseGateSummary()` | `GET /v1/release-gates/summary` | `MotherReleaseGateSummary` |
| `getMotherAlerts(params)` | `GET /v1/alerts?...` | `MotherAlertsResponse` |
| `getMotherAlert(id)` | `GET /v1/alerts/:id` | `MotherAlertResponse` |
| `getMotherAlertSummary()` | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |

**Total GET wrappers: 26**

### POST endpoints (in `lib/api.ts`, intentionally NOT exposed in any page UI)

| Function | Mother endpoint | Notes |
|---|---|---|
| `evaluateMotherAlerts()` | `POST /v1/alerts/evaluate` | Would trigger re-evaluation |
| `resolveMotherAlert(id)` | `POST /v1/alerts/:id/resolve` | Write action — suppresses alerts |
| `muteMotherAlert(id)` | `POST /v1/alerts/:id/mute` | Write action |
| `unmuteMotherAlert(alertId)` | `POST /v1/alerts/:id/unmute` | Write action |
| `validateMotherAgentConfig(id, cfg)` | `POST /v1/agents/:id/config/validate` | Sends config JSON to Mother |
| `publishMotherAgentConfig(id, note)` | `POST /v1/agents/:id/config/publish` | Publishes config — high-risk |
| `rollbackMotherAgentConfig(id, v, note)` | `POST /v1/agents/:id/config/rollback` | Rolls back config — high-risk |

**Total POST wrappers: 7 — none exposed in the current UI.**

---

## Page-by-page audit

---

### 1. Overview (`/`)

**Data aggregator:** `lib/dashboard/server-data.ts` → `getDashboardOverview()`

**What UI exists:**
- Overall posture hero badge + status strip (Mother health / agents online / release / safety mode)
- 4 KPI cards: Gateway Agents total, Fresh telemetry count, Active alerts, Safety mode
- System pulse grid: Mother health, Storage, Release gates, Alert center
- Agent cards (up to 4) with link to `/agents`
- Latest alerts table (up to 5 rows)
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Mother health | `GET /healthz` | `HealthResponse` |
| Ready/storage | `GET /readyz` | `ReadyResponse` |
| Agent registry | `GET /v1/agents` | `MotherAgentsResponse` |
| Alert summary | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |
| Release gate summary | `GET /v1/release-gates/summary` | `MotherReleaseGateSummary` |
| Storage status | `GET /v1/storage/status` | `MotherStorageStatusResponse` |

**Agent telemetry fields surfaced:**  
`status`, `telemetry_status`, `agent_id`, `last_seen_at` — via `AgentCard` component.  
`last_match_rate`, `last_received`, `last_mismatched` present in `MotherAgentRecord` but not shown on Overview.

**What is missing:**
- Average fleet match rate not shown in hero stats (available from `MotherDiagnosticsSummary.average_match_rate`)
- Config rollout summary (pending/delivered/acknowledged) not shown (available from `MotherDiagnosticsSummary`)
- Recent critical events count not shown (available from `MotherHealthReportResponse`)
- `DashboardOverview` contract does not include diagnostics summary or health report

**Mother API endpoint needed:**  
`GET /v1/diagnostics/summary` — already exists in `lib/api.ts` as `getMotherDiagnosticsSummary()`.  
Would require adding a call inside `getDashboardOverview()` and extending the `DashboardOverview` contract.

**Agent telemetry fields needed:**  
`MotherDiagnosticsSummary.average_match_rate`, `configs_pending_delivery`

**Backend changes required:**  
No new Mother endpoints. Change is in `lib/dashboard/server-data.ts` only — add `getMotherDiagnosticsSummary()` call.

**Safety risk if implemented incorrectly:**  
Low. All values are read-only aggregates. No secret fields are involved.

---

### 2. Agents (`/agents`)

**What UI exists:**
- Registry posture hero (online/total, stale, unknown, active alerts)
- 4 KPI cards: Fresh telemetry, Missing telemetry, Avg match rate, Active alerts
- Telemetry freshness pulse grid (fresh/stale/missing breakdown with percentages)
- Policy sync state pulse grid (in-sync/pending/stale)
- Agent card grid (all agents, links to detail)
- Registry table (agent ID, status, telemetry status, last telemetry, match rate, config sync, received count)
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Agent registry + telemetry fields | `GET /v1/agents` | `MotherAgentsResponse` |
| Diagnostics summary (telemetry/sync counts) | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |
| Alert summary | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |

**Agent telemetry fields surfaced:**  
`agent_id`, `status`, `telemetry_status`, `last_telemetry_at`, `last_match_rate`, `config_sync_status`, `last_received`, `stale_agent_ids` (stale chip links).

**What is missing:**
- `last_mismatched` per agent — in `MotherAgentRecord`, not in registry table
- `pull_count` per agent — not in registry table
- `first_seen_at` per agent — not shown anywhere on the fleet view
- `acknowledged_config_version` per agent — not in registry table

**Mother API endpoint needed:** None — all data is in `GET /v1/agents` response.

**Agent telemetry fields needed:**  
`MotherAgentRecord.last_mismatched`, `pull_count`, `first_seen_at`, `acknowledged_config_version` — all already in the type, just not rendered.

**Backend changes required:** No. All fields exist in `MotherAgentRecord`.

**Safety risk:** None. All values are read-only.

---

### 3. Agent detail (`/agents/[agent_id]`)

**What UI exists:**
- Stale/unknown posture banner (amber or slate depending on status)
- Hero: connection status, last seen, source IP, pull count + 3 hero-stats pills
- 4 KPI cards: Policy pulls, Config version, Received, Mismatched
- Telemetry posture KV table
- Config sync posture KV table
- Active config section (raw JSON in drawer)
- Latest telemetry section (raw JSON in drawer)
- Config versions table (version/status/hash/published/source)
- Events table (time/severity/type/message)
- Active alerts table (severity/title/last seen)
- Raw JSON drawer (detail, assignment, control, config, history, diagnostics)

**Real data source:**

| Data | Mother endpoint | Type | Rendered? |
|---|---|---|---|
| Agent detail | `GET /v1/agents/:id` | `MotherAgentResponse` | Yes |
| Policy assignment | `GET /v1/agents/:id/policy-assignment` | `MotherPolicyAssignmentResponse` | Partial — `assigned` only |
| Control plane | `GET /v1/agents/:id/control-plane` | `MotherControlPlaneResponse` | Active config fallback only |
| Config (active + draft) | `GET /v1/agents/:id/config` | `MotherConfigResponse` | Active config JSON drawer |
| Config history | `GET /v1/agents/:id/config/history` | `MotherConfigHistoryResponse` | **Raw drawer only** |
| Config versions | `GET /v1/agents/:id/config/versions` | `MotherConfigVersionsResponse` | Yes — full table |
| Telemetry | `GET /v1/agents/:id/telemetry` | `MotherTelemetryResponse` | Yes — JSON drawer |
| Per-agent diagnostics | `GET /v1/agents/:id/diagnostics` | `MotherDiagnosticsResponse` | **Raw drawer only** |
| Events | `GET /v1/agents/:id/events` | `MotherEventsResponse` | Yes — table (12 rows) |
| Active alerts for agent | `GET /v1/alerts?status=active&agent_id=:id` | `MotherAlertsResponse` | Yes — table |

**Agent telemetry fields surfaced:**  
`telemetry_status`, `last_telemetry_at`, `remote_addr`, `stale_after_seconds`, `last_received`, `last_mismatched`, `active_config_version`, `active_config_hash`, `last_config_delivered_at`, `acknowledged_config_version`, `last_config_ack_at`, `config_sync_status`.  
`telemetry.payload` surfaced as raw JSON.

**What is missing:**
1. **Config history not rendered** — `historyResult` is fetched (`GET /v1/agents/:id/config/history`) but only appears in the raw drawer. The `MotherConfigHistoryResponse.history[]` array contains full history entries with timestamps, hashes, sources, and rollback markers.
2. **Per-agent diagnostics not rendered** — `diagnosticsResult` is fetched but only in raw drawer. `MotherDiagnosticsResponse.diagnostics` contains `telemetry` + `events[]` (overlapping with rendered sections, so low priority).
3. **Policy assignment detail incomplete** — `MotherPolicyAssignmentResponse.policy_id` not shown, only `assigned: true/false`.
4. **Config diff not fetched** — `getMotherAgentConfigDiff()` is available in api.ts but not called on this page. The diff shows `active_version`, `draft_version`, `dirty`, `added[]`, `removed[]`, `changed[]`.
5. **Telemetry payload structured fields** — payload is raw JSON. Common fields like `mode`, `version`, `uptime_seconds` inside `payload` are not extracted and displayed in a structured table.
6. **Draft config** — draft config from `configResult.draft_config` is not displayed (only active config shown).
7. **Agent `first_seen_at`** — not shown in the hero or KPIs.

**Mother API endpoint needed:**  
`GET /v1/agents/:id/config/diff` — already in `lib/api.ts` as `getMotherAgentConfigDiff()`.

**Agent telemetry fields needed:**  
`telemetry.payload.mode`, `telemetry.payload.version`, `telemetry.payload.uptime_seconds` (structure depends on Agent implementation).

**Backend changes required:**  
No. All needed GET endpoints already exist in `lib/api.ts`.

**Safety risk:**  
Config diff is read-only. Showing draft config is read-only. No risk as long as no write controls are added alongside these sections.

---

### 4. Mother (`/mother`)

**What UI exists:**
- Overall posture hero (operational/degraded/unavailable)
- 4 KPI cards: Health, Ready, Mother URL (shows "Local-only"), Registered agents
- Mother Core status KV grid (service/mode/health/ready/policy/storage)
- Storage status KV table with persisted object counts table
- Default policy KV table
- Safety model checklist
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Health | `GET /healthz` | `HealthResponse` |
| Ready | `GET /readyz` | `ReadyResponse` |
| Default policy | `GET /v1/policies/default` | `MotherPolicyResponse` |
| Diagnostics summary | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |
| Storage status | `GET /v1/storage/status` | `MotherStorageStatusResponse` |

**What is missing:**
1. **`getMotherHealthReport()` not called** — this endpoint (`GET /v1/health/report`) aggregates backup/restore status, shadow-only safety status, public exposure status, security configuration, and recent critical events. None of these are shown on the Mother page despite being conceptually core to it.
2. **`storage.tables`** — `MotherStorageStatusResponse.tables` (Record<string, number>) is in the type but not rendered.
3. **`storage.dsn_redacted`** — redacted DSN string in storage status type, not rendered.
4. **Diagnostics summary telemetry counts** — `summary.telemetry_fresh`, `telemetry_stale`, `telemetry_missing`, `online_agents` are available from the fetched `summaryResult` but only `total_agents` is shown (as a KPI hint).
5. **Recent critical events** — `MotherDiagnosticsSummary.recent_events[]` is available but not rendered.

**Mother API endpoint needed:**  
`GET /v1/health/report` — already exists in `lib/api.ts` as `getMotherHealthReport()`.

**Agent telemetry fields needed:** None directly.

**Backend changes required:** No. `getMotherHealthReport()` already exists in `lib/api.ts`.

**Safety risk:** `MotherHealthReportResponse.security_configuration` is `UnknownRecord` — must never render raw values if they contain secret-adjacent keys. Must filter to only safe labels (presence checks only, no values).

---

### 5. Diagnostics (`/diagnostics`)

**What UI exists:**
- Overall posture hero (nominal/attention needed/unavailable)
- 6 KPI cards: Mother health, Mother ready, Storage, Match rate, Fresh/stale/missing, Critical alerts
- Alert posture pulse grid (critical/warn/info/resolved 24h) + scope breakdown table + latest alerts table
- Storage detail KV table
- Config rollout posture pulse grid (published/pending/acknowledged/stale)
- Agent diagnostics snapshot table (agent/status/telemetry/received/mismatched/last seen)
- Release safety signals checklist (backup/shadow/exposure/recent critical events)
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Health | `GET /healthz` | `HealthResponse` |
| Ready | `GET /readyz` | `ReadyResponse` |
| Agents | `GET /v1/agents` | `MotherAgentsResponse` |
| Diagnostics summary | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |
| Storage status | `GET /v1/storage/status` | `MotherStorageStatusResponse` |
| Alert summary | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |
| Health report | `GET /v1/health/report` | `MotherHealthReportResponse` |

All 7 fetched results are rendered. This is the most data-complete page in the dashboard.

**Agent telemetry fields surfaced:**  
`agent_id`, `status`, `telemetry_status`, `last_received`, `last_mismatched`, `last_seen_at` — in the agent snapshot table.  
`stale_agent_ids`, `mismatched_agent_ids` — available in summary type but `mismatched_agent_ids` is not rendered.

**What is missing:**
1. **`mismatched_agent_ids` list** — `MotherDiagnosticsSummary.mismatched_agent_ids[]` is in the type and fetched, but not shown. Stale agent IDs are linked on Agents page but mismatched agent IDs are not linked anywhere.
2. **`latest_config_events[]`** — `MotherDiagnosticsSummary.latest_config_events[]` is in the type but not rendered.
3. **Per-agent diagnostics drill-down** — `getMotherAgentDiagnostics(id)` exists per agent but would require an agent selector to avoid N+1 calls on page load. Currently not implemented on this page.

**Mother API endpoint needed:**  
`GET /v1/agents/:id/diagnostics` — already in `lib/api.ts`. Would require an agent selector component (same pattern as `/gateway`).

**Agent telemetry fields needed:**  
`MotherDiagnosticsSummary.mismatched_agent_ids`, `latest_config_events`.

**Backend changes required:** No.

**Safety risk:** Low. All values are read-only counts and timestamps.

---

### 6. Policy (`/policy`)

**What UI exists:**
- Policy sync state hero (default policy ID, profile, version, source)
- Hero stats: sync status, policies in catalog, assignment control, enforcement
- Policy sync state KV grid (ID/profile/version/source + sync/pending/stale/rollout posture)
- Default policy detail KV table
- Policy catalog table (ID/profile/version/source/default flag)
- Safety posture checklist
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Full policy catalog | `GET /v1/policies` | `MotherPoliciesResponse` |
| Default policy detail | `GET /v1/policies/default` | `MotherPolicyResponse` |
| Ready (policy source/status) | `GET /readyz` | `ReadyResponse` |
| Diagnostics summary (rollout state) | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |

**Agent telemetry fields surfaced:** None directly.  
(Rollout posture comes from `MotherDiagnosticsSummary.configs_pending_delivery` / `configs_stale`.)

**What is missing:**
1. **Per-policy detail click-through** — the catalog table shows ID/profile/version/source but clicking a row does nothing. `getMotherPolicy(id)` exists and could serve a detail view.
2. **Fleet version distribution** — how many agents are on each policy version. `MotherAgentRecord.last_policy_version` and `last_policy_profile_id` are available via `getMotherAgents()`, but that call is not made on the Policy page. A distribution chart would show policy rollout coverage.
3. **`getMotherDebugDefaultPolicy()`** — `GET /v1/debug/policies/default` exists in `lib/api.ts` but is never called. Returns the raw policy used by Mother for evaluation.
4. **Per-agent policy assignment** — `getMotherPolicyAssignment(id)` exists per agent but would require an agent selector or fleet loop.

**Mother API endpoint needed:**  
`GET /v1/policies/:id` — already in `lib/api.ts` as `getMotherPolicy(id)`.  
`GET /v1/agents` — already in `lib/api.ts` as `getMotherAgents()` (for version distribution).

**Agent telemetry fields needed:**  
`MotherAgentRecord.last_policy_version`, `last_policy_profile_id` — for fleet distribution.

**Backend changes required:** No.

**Safety risk:** Per-policy detail is read-only. Fleet loop over agents is acceptable as a single `GET /v1/agents` call.

---

### 7. Release (`/release`)

**What UI exists:**
- Hero: Go/No-Go badge, pass/warn/fail/evaluated stats
- Release gate posture strip (summary bar) + safety signal checklist (backup/shadow/exposure/telemetry/events/alerts)
- Release gates full list (grouped by status via `ReleaseGatePanel`)
- Active release blockers (failing gates)
- Active alerts table
- Operator checklist (static, for human sign-off)
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Full gate list + summary | `GET /v1/release-gates` | `MotherReleaseGatesResponse` |
| Health report (backup/shadow/exposure/events) | `GET /v1/health/report` | `MotherHealthReportResponse` |
| Active alerts | `GET /v1/alerts?status=active&limit=20` | `MotherAlertsResponse` |
| Diagnostics summary (telemetry) | `GET /v1/diagnostics/summary` | `MotherDiagnosticsSummaryResponse` |

All 4 fetched results are rendered. This page is data-complete.

**Agent telemetry fields surfaced:**  
`telemetry_fresh`, `total_agents`, `telemetry_missing` — from diagnostics summary. Individual agent IDs are not shown on this page.

**What is missing:**
1. **Gate `last_checked_at` per gate** — `MotherReleaseGate.last_checked_at` is in the type. The gate panels do not show when each gate was last evaluated.
2. **Gate `evidence` detail** — `MotherReleaseGate.evidence` is `UnknownRecord`. Currently only `message` and `remediation_hint` are shown per gate. Evidence detail would give more context.
3. **Historical gate evaluation** — no endpoint exists in `lib/api.ts` for gate history. Would require a new Mother endpoint.
4. **`MotherReleaseGateSummary.generated_at`** is shown only when present — this is already handled correctly.

**Mother API endpoint needed:**  
No new endpoints needed. Gate history would require a new Mother endpoint (`GET /v1/release-gates/history`) that does not currently exist in `lib/api.ts`.

**Agent telemetry fields needed:** None beyond what is already surfaced.

**Backend changes required:**  
None for existing gaps. Gate history would require a new Mother endpoint and a new `lib/api.ts` wrapper.

**Safety risk:** Release gate list and evidence are read-only. Exposing `evidence` as raw JSON must go through a `RawJsonDrawer` only — not inline in the table.

---

### 8. Gateway (`/gateway`)

**What UI exists:**
- Shadow-only readonly banner
- Hero: runtime mode badge, hero stats (runtime source / enforcement / agents registered / selected agent sync)
- Agent selector component
- 4 KPI cards (when agent selected): Agent, Active version, Draft version, Dirty flag
- Active config section (JSON in drawer)
- Draft diff section (diff JSON in drawer)
- Config versions table (version/status/hash/published/source)
- Safety model checklist
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| All agents (for selector) | `GET /v1/agents` | `MotherAgentsResponse` |
| Active + draft config | `GET /v1/agents/:id/config` | `MotherConfigResponse` |
| Diff (dirty flag) | `GET /v1/agents/:id/config/diff` | `MotherConfigDiffResponse` |
| Config versions | `GET /v1/agents/:id/config/versions` | `MotherConfigVersionsResponse` |

**Agent telemetry fields surfaced:**  
`agent_id` (selector only). Config fields: `version`, `config_hash`, `status`, `published_at`, `source`.

**What is missing:**
1. **Diff field changes not rendered** — `MotherConfigDiffResponse.diff.added[]`, `diff.removed[]`, `diff.changed[]` are in the type but only `dirty: true/false` is shown. When `dirty = true`, the specific changed fields are available but not displayed.
2. **Config history not fetched** — `getMotherAgentConfigHistory()` (`GET /v1/agents/:id/config/history`) is available in `lib/api.ts` but not called on this page. The versions table shows a summarized view; the history endpoint provides full historical entries with rollback markers.
3. **Draft config structured view** — draft config is passed to `RawJsonDrawer` as raw JSON. The structured fields (`gateway.enabled`, `gateway.mode`, `campaign.enabled`, `queue.enabled`, `bot.enabled`, `storage.fail_mode`, `security.require_signature`) are defined in `controlPlaneConfigFromForm()` but not extracted for display.
4. **Active config structured view** — same as draft — raw JSON only.
5. **`getMotherAgentConfigDraft()` and `getMotherAgentConfigActive()`** — separate focused endpoints exist but the combined `getMotherAgentConfig()` already returns both; these are redundant.

**Mother API endpoint needed:**  
`GET /v1/agents/:id/config/history` — already in `lib/api.ts` as `getMotherAgentConfigHistory()`.

**Agent telemetry fields needed:** None.

**Backend changes required:** No. One additional `lib/api.ts` call in the Gateway page component.

**Safety risk:**  
Rendering structured config fields (gateway mode, enforcement flags) must be read-only. The `gateway.mode` field must never be rendered as an editable toggle — it must be a `StatusPill` only.  
Config history is read-only. No risk if no write controls accompany it.

---

### 9. Alerts (`/alerts`)

**What UI exists:**
- Read-only management banner
- Hero: alert posture badge + active/critical/muted/resolved-24h stats
- 6 KPI cards: Active, Critical, Warn, Info, Muted, Resolved 24h
- Alerts by scope pulse grid
- Active alerts table (severity/status/scope/agent/title/first seen/last seen/count)
- Raw JSON drawer (summary + history slice of 20)

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Alert summary (KPIs + scope) | `GET /v1/alerts/summary` | `MotherAlertSummaryResponse` |
| Active alerts (table) | `GET /v1/alerts?status=active&limit=200` | `MotherAlertsResponse` |
| Alert history (raw drawer only) | `GET /v1/alerts?limit=100` | `MotherAlertsResponse` |

**Agent telemetry fields surfaced:**  
`MotherAlertRecord.agent_id`, `scope`, `severity`, `status`, `title`, `first_seen_at`, `last_seen_at`, `occurrence_count`.

**What is missing:**
1. **Alert `message` body not in table** — `MotherAlertRecord.message` is in the type and fetched (inside the active alerts result) but the active alerts table column list does not include `message`. Only `title` is shown.
2. **Alert `type` column missing** — `MotherAlertRecord.type` is in the type but not in the table.
3. **Alert history table not rendered** — `history` (100 alerts including resolved/muted) is fetched and sent to the raw drawer, but there is no rendered history section. Adding a collapsible "Recent history" table would surface resolved and muted alert state.
4. **`getMotherAlert(id)` not used** — per-alert detail is not available. There is no click-through to a full alert record view.
5. **`evaluateMotherAlerts()`, `resolveMotherAlert()`, `muteMotherAlert()`** — intentionally not exposed. These are POST operations and must not be added without full RBAC gate and explicit operator confirmation. The page already warns about this clearly.

**Mother API endpoint needed:**  
`GET /v1/alerts/:id` — already in `lib/api.ts` as `getMotherAlert()`. Would be used for a detail drawer.

**Agent telemetry fields needed:** None beyond what is in `MotherAlertRecord`.

**Backend changes required:** No.

**Safety risk:**  
Alert resolve/mute are POST operations. If implemented, they must be gated by a specific `alerts.manage` permission (currently undefined in RBAC), wrapped in server actions, confirmed with a two-step UI, and fully audit-logged. **Do not add these write operations without explicit operator sign-off.**

---

### 10. Settings (`/settings`)

**What UI exists:**
- Configuration posture hero (fully configured / needs attention)
- Hero stats: Auth / Mother / Storage / Policies synced
- 4 KPI cards: Auth, Mother, Ready, Storage — the Mother KPI shows `motherBaseUrl` as its `hint` prop
- Dashboard security KV table (auth enabled, session secret, management token, trust proxy, user store path)
- Mother policies table (ID/profile/version/source)
- Safety posture checklist
- Raw JSON drawer (security, health, ready, storage)

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Health | `GET /healthz` | `HealthResponse` |
| Ready | `GET /readyz` | `ReadyResponse` |
| Policy catalog | `GET /v1/policies` | `MotherPoliciesResponse` |
| Storage status | `GET /v1/storage/status` | `MotherStorageStatusResponse` |
| Dashboard security | Local — `dashboardSecuritySummary()` | Local function |

**Agent telemetry fields surfaced:** None.

**What is missing:**
1. **`motherBaseUrl` exposed in KpiCard `hint`** — Line 46: `<KpiCard ... hint={motherBaseUrl} .../>`. The internal Mother URL (e.g. `http://127.0.0.1:8732`) is rendered as browser-visible HTML. This is a minor information-disclosure issue: the internal address is visible in the page source to anyone who can view the Settings page. It should be replaced with `"configured"` or `"local (server-side only)"`.
2. **`getMotherHealthReport()` not called** — backup/restore status, shadow-only safety status, security configuration, and recent critical events are not shown on the Settings page. Diagnostics page already shows these but Settings would benefit from the security configuration section.
3. **`storage.tables`** — `MotherStorageStatusResponse.tables` (per-table row counts) is in the type but not shown.
4. **`storage.dsn_redacted`** — redacted DSN string not shown.

**Mother API endpoint needed:**  
`GET /v1/health/report` — already in `lib/api.ts`.

**Agent telemetry fields needed:** None.

**Backend changes required:** No.

**Safety risk:**  
`motherBaseUrl` info disclosure is already low risk (Settings page requires `settings.view` permission, and the URL is localhost). However it is a hardening gap. Fix is a one-line change: replace `hint={motherBaseUrl}` with `hint="server-side only"`.  
`security_configuration` from health report must only render presence checks — never raw values.

---

### 11. Sync (`/sync`)

**What UI exists:**
- Observation-only banner
- Hero: sync posture badge, agents tracked, hero stats (in-sync/stale/unknown/push available)
- 4 KPI cards: In sync, Stale/error, Unknown, Total policy pulls
- Agent sync states table (agent/policy pull/policy version/config delivered/config acknowledged/sync status/pull count)
- Empty state with install guidance
- Raw JSON drawer

**Real data source:**

| Data | Mother endpoint | Type |
|---|---|---|
| Agent registry with sync fields | `GET /v1/agents` | `MotherAgentsResponse` |

**Agent telemetry fields surfaced:**  
`agent_id`, `last_policy_pull_at`, `last_policy_version`, `last_config_delivered_at`, `last_config_ack_at`, `config_sync_status`, `pull_count`.

**What is missing:**
1. **`acknowledged_config_version`** — `MotherAgentRecord.acknowledged_config_version` is in the type and available in the fetched data but not in the sync table.
2. **`acknowledged_config_hash`** — same — not shown.
3. **Delivery → acknowledgement gap** — `last_config_delivered_at` and `last_config_ack_at` are both shown as raw timestamps. A computed "delay" column (difference in human-readable format) would make sync lag visible.
4. **Fleet sync rate KPI** — percentage of agents that are in-sync is not shown as a formatted percentage (only raw counts).
5. **Per-agent config diff** — `getMotherAgentConfigDiff(id)` exists but would require N parallel calls for a fleet view. Not recommended for fleet-level display; better as a drill-down from the agent detail page.

**Mother API endpoint needed:** None — all data is in `GET /v1/agents`.

**Agent telemetry fields needed:**  
`MotherAgentRecord.acknowledged_config_version`, `acknowledged_config_hash` — already in type, already fetched.

**Backend changes required:** No.

**Safety risk:** None. All values are read-only timestamps and version numbers.

---

## Cross-cutting observations

### Functions in `lib/api.ts` never called from any page UI

| Function | Endpoint | Reason unused |
|---|---|---|
| `getMotherDebugDefaultPolicy()` | `GET /v1/debug/policies/default` | Debug endpoint — useful for policy page but skipped |
| `getMotherAgentConfigDraft(id)` | `GET /v1/agents/:id/config/draft` | Redundant — `getMotherAgentConfig()` returns both |
| `getMotherAgentConfigActive(id)` | `GET /v1/agents/:id/config/active` | Redundant — `getMotherAgentConfig()` returns both |
| `getMotherAlert(id)` | `GET /v1/alerts/:id` | Per-alert detail view not implemented |
| `evaluateMotherAlerts()` | `POST /v1/alerts/evaluate` | Intentionally not exposed |
| `resolveMotherAlert(id)` | `POST /v1/alerts/:id/resolve` | Intentionally not exposed |
| `muteMotherAlert(id)` | `POST /v1/alerts/:id/mute` | Intentionally not exposed |
| `unmuteMotherAlert(id)` | `POST /v1/alerts/:id/unmute` | Intentionally not exposed |
| `validateMotherAgentConfig(id, cfg)` | `POST /v1/agents/:id/config/validate` | Intentionally not exposed |
| `publishMotherAgentConfig(id, note)` | `POST /v1/agents/:id/config/publish` | Intentionally not exposed |
| `rollbackMotherAgentConfig(id, v, note)` | `POST /v1/agents/:id/config/rollback` | Intentionally not exposed |

### Data fetched but not rendered (raw drawer only)

| Page | Fetched but not rendered |
|---|---|
| Agent detail | `historyResult` (config history), `diagnosticsResult` (per-agent diagnostics) |
| Alerts | `history` (100 alert records) |
| Overview | `storage` — storage data is fetched in overview aggregator but only partially used |

### Fields in type, fetched, but not displayed

| Page | Field | Type | Available via |
|---|---|---|---|
| Agents | `last_mismatched`, `pull_count`, `first_seen_at` | `MotherAgentRecord` | `getMotherAgents()` |
| Agent detail | `config_diff.added[]`, `config_diff.removed[]`, `config_diff.changed[]` | `MotherConfigDiffResponse` | Not fetched on this page |
| Agent detail | `telemetry.payload.mode`, `.version`, `.uptime_seconds` | `MotherTelemetryRecord.payload` | `getMotherAgentTelemetry()` |
| Agent detail | `assignment.policy_id` | `MotherPolicyAssignmentResponse` | `getMotherPolicyAssignment()` |
| Alerts | `message`, `type` | `MotherAlertRecord` | `getMotherAlerts()` |
| Gateway | `diff.added[]`, `diff.removed[]`, `diff.changed[]` | `MotherConfigDiffResponse` | `getMotherAgentConfigDiff()` |
| Mother | `healthReport.backup_restore_status`, `security_configuration` | `MotherHealthReportResponse` | Not fetched |
| Mother | `summary.telemetry_fresh`, `online_agents`, `recent_events[]` | `MotherDiagnosticsSummaryResponse` | Fetched, only `total_agents` shown |
| Settings | `motherBaseUrl` | string constant | Exposed in KpiCard hint — info disclosure |
| Sync | `acknowledged_config_version`, `acknowledged_config_hash` | `MotherAgentRecord` | `getMotherAgents()` |

---

## Top 10 required integration tasks

Ordered by value-to-effort ratio, safety priority, and logical sequence.

| # | Task | Pages | API change | Effort |
|---|---|---|---|---|
| **1** | **Mask `motherBaseUrl` in Settings KpiCard hint** | Settings | None — one-line UI change | Trivial |
| **2** | **Render config history section on Agent detail** | Agent detail | None — `historyResult` already fetched | Low |
| **3** | **Show alert `message` + `type` columns in Alerts table** | Alerts | None — already fetched | Trivial |
| **4** | **Render alert history table on Alerts page** | Alerts | None — `history` already fetched | Low |
| **5** | **Surface diff field changes on Gateway page** | Gateway | None — `diff.added/removed/changed` already in `diffResult` | Low |
| **6** | **Add config history table on Gateway page** | Gateway | `getMotherAgentConfigHistory()` — already in `lib/api.ts` | Low |
| **7** | **Show `acknowledged_config_version` + hash on Sync page** | Sync | None — already in `MotherAgentRecord` | Trivial |
| **8** | **Add `getMotherHealthReport()` to Mother page** | Mother | `getMotherHealthReport()` — already in `lib/api.ts` | Low |
| **9** | **Add fleet policy version distribution to Policy page** | Policy | `getMotherAgents()` — one new call, already in `lib/api.ts` | Low |
| **10** | **Render policy assignment `policy_id` on Agent detail** | Agent detail | None — `assignmentResult` already fetched | Trivial |

### Items explicitly excluded from implementation

The following integrations **must not be added** without operator sign-off and explicit RBAC design:

- Alert resolve, mute, unmute — write operations on live alert state
- Config publish — deploys a new config to a live agent fleet
- Config rollback — mutates agent config history
- Config validate — sends config payloads to Mother; must be scoped and audited
- Remote command of any kind — violates shadow-only safety model

---

## Safety summary

| Risk | Page | Severity | Notes |
|---|---|---|---|
| `motherBaseUrl` in browser HTML | Settings | Low | Only visible to `settings.view` users; localhost address only |
| `security_configuration` from health report | Mother (future) | Medium | Must render presence only, never values |
| Alert write operations | Alerts | High | Must not be added without `alerts.manage` RBAC, server actions, two-step confirm, and audit log |
| Config publish / rollback | Gateway | Critical | Must remain completely absent — these mutate live agent configuration |
| Agent telemetry `payload` | Agent detail | Low | Payload is arbitrary JSON from Agent; any display must be in `RawJsonDrawer`, not inline |

---

## Appendix: `MotherAgentRecord` field coverage by page

| Field | Overview | Agents | Agent detail | Sync | Gateway | Diagnostics |
|---|---|---|---|---|---|---|
| `agent_id` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `status` | ✓ | ✓ | ✓ | — | — | ✓ |
| `telemetry_status` | ✓ | ✓ | ✓ | — | — | ✓ |
| `last_seen_at` | — | — | ✓ | — | — | ✓ |
| `last_telemetry_at` | — | ✓ | ✓ | — | — | — |
| `last_match_rate` | — | ✓ | ✓ | — | — | — |
| `last_received` | — | ✓ | ✓ | — | — | ✓ |
| `last_mismatched` | — | — | ✓ | — | — | ✓ |
| `pull_count` | — | — | ✓ | ✓ | — | — |
| `config_sync_status` | — | ✓ | ✓ | ✓ | — | — |
| `last_policy_pull_at` | — | — | ✓ | ✓ | — | — |
| `last_policy_version` | — | — | — | ✓ | — | — |
| `last_config_delivered_at` | — | — | ✓ | ✓ | — | — |
| `last_config_ack_at` | — | — | ✓ | ✓ | — | — |
| `active_config_version` | — | — | ✓ | — | — | — |
| `active_config_hash` | — | — | ✓ | — | — | — |
| `acknowledged_config_version` | — | — | ✓ | ❌ missing | — | — |
| `acknowledged_config_hash` | — | — | — | ❌ missing | — | — |
| `first_seen_at` | — | ❌ missing | — | — | — | — |
| `stale_after_seconds` | — | — | ✓ | — | — | — |
| `last_source_ip` | — | — | ✓ | — | — | — |
| `last_policy_profile_id` | — | — | — | — | — | — |

✓ = surfaced in UI · ❌ missing = in response, not rendered · — = not relevant on that page
