# Release Notes — R10.18 Function / Data Integration Audit

**Release:** R10.18  
**Date:** 2026-07-04  
**Scope:** Audit-only release. No page UI, API, auth, RBAC, or runtime changes were made.

---

## Summary

R10.18 is a pure audit pass. All 11 in-scope pages were read at the source level and cross-referenced
against the full Mother API surface in `lib/api.ts` and all TypeScript types in `lib/types.ts`.
The output is a structured integration map at:

```
docs/R10_18_FUNCTION_INTEGRATION_AUDIT.md
```

No functional code was changed. The build remains identical to R10.17.

---

## Changed files

| File | Change |
|---|---|
| `docs/R10_18_FUNCTION_INTEGRATION_AUDIT.md` | New — full integration audit |
| `RELEASE_NOTES_R10_18.md` | New — this file |

---

## Audit coverage

| Page | Data complete? | Top gap |
|---|---|---|
| Overview (`/`) | Partial | Match rate + config rollout counts not in hero |
| Agents (`/agents`) | Good | `last_mismatched`, `pull_count`, `first_seen_at` not in registry table |
| Agent detail (`/agents/[agent_id]`) | Very good (10 API calls) | `historyResult` fetched but raw-drawer only; diff not fetched |
| Mother (`/mother`) | Good | `getMotherHealthReport()` not called; `storage.tables` not shown |
| Diagnostics (`/diagnostics`) | Complete | `mismatched_agent_ids` not rendered; per-agent drill-down missing |
| Policy (`/policy`) | Partial | No per-policy click-through; no fleet version distribution |
| Release (`/release`) | Complete | Gate `last_checked_at` + `evidence` not shown per gate |
| Gateway (`/gateway`) | Good | `diff.added/removed/changed` not rendered; config history not fetched |
| Alerts (`/alerts`) | Partial | `message` + `type` columns missing; history table not rendered |
| Settings (`/settings`) | Good | `motherBaseUrl` in browser HTML (info disclosure); health report not called |
| Sync (`/sync`) | Good | `acknowledged_config_version` + hash not in table |

---

## Top 10 required integration tasks

| # | Task | Pages | API change needed | Effort |
|---|---|---|---|---|
| 1 | Mask `motherBaseUrl` in Settings KpiCard hint | Settings | None — one-line UI change | Trivial |
| 2 | Render config history section on Agent detail | Agent detail | None — `historyResult` already fetched | Low |
| 3 | Show alert `message` + `type` columns in Alerts table | Alerts | None — already fetched | Trivial |
| 4 | Render alert history table on Alerts page | Alerts | None — `history` already fetched | Low |
| 5 | Surface diff field changes on Gateway (added/removed/changed) | Gateway | None — already in `diffResult` | Low |
| 6 | Add config history table on Gateway page | Gateway | `getMotherAgentConfigHistory()` — already in `lib/api.ts` | Low |
| 7 | Show `acknowledged_config_version` + hash on Sync page | Sync | None — already in `MotherAgentRecord` | Trivial |
| 8 | Add `getMotherHealthReport()` to Mother page | Mother | `getMotherHealthReport()` — already in `lib/api.ts` | Low |
| 9 | Add fleet policy version distribution to Policy page | Policy | `getMotherAgents()` — one new call, already in `lib/api.ts` | Low |
| 10 | Render policy assignment `policy_id` on Agent detail | Agent detail | None — `assignmentResult` already fetched | Trivial |

**Key finding:** 7 of the top 10 tasks require zero new Mother endpoints or new `lib/api.ts` wrappers.
The data is already being fetched — it is just not being rendered.

---

## Explicitly excluded from future implementation

The following must not be added without explicit operator sign-off and RBAC design review:

- Alert resolve / mute / unmute (POST write operations)
- Config publish or rollback (mutates live agent configuration — critical risk)
- Config validate (sends config payloads to Mother — must be scoped and audited)
- Any remote command or enforcement action

---

## API surface summary

| Category | Count |
|---|---|
| Mother GET wrappers in `lib/api.ts` | 26 |
| Mother POST wrappers in `lib/api.ts` | 7 |
| POST wrappers exposed in UI | 0 |
| GET wrappers never called from any page | 3 (debug default policy, config draft, config active — redundant or debug-only) |
| Data fetched but rendered only in raw drawer | 3 cases across 2 pages |

---

## Build

```
cd unixsee_campaign_gateway/dashboard
npm ci
npm run build
```

Result: 17 routes compiled, zero TypeScript errors (identical to R10.17).
