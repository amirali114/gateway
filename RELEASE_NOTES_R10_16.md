# Release Notes — R10.16: Mother + Agent Product Surface

**Date:** 2026-07-04
**Scope:** UI/design only — no auth, RBAC, API, runtime, or backend changes

---

## Summary

R10.16 completes the Mother + Agent product surface UI across six routes:
`/agents`, `/agents/[agent_id]`, `/mother`, `/diagnostics`, `/policy`, `/release`.

All UI text is now English (LTR). No Persian/Farsi text remains in scope pages or shared components.
All action buttons that would trigger deploy, rollback, or enforcement have been removed from the visible surface.

---

## Changed Files

### Shared Components
| File | Change |
|---|---|
| `src/components/StatusPill.tsx` | All status labels translated to English |
| `src/components/Sidebar.tsx` | Nav labels, footer, user info translated to English; border-r direction corrected for LTR |
| `src/components/Topbar.tsx` | Search placeholder, refresh title, and bell alignment updated for LTR |
| `src/components/ReleaseGatePanel.tsx` | All labels English; added gate posture banner (blocked / all clear) |
| `src/components/AgentCard.tsx` | All labels English; added telemetry freshness badge (Live / stale age); added offline guidance inline panel |

### Data Layer
| File | Change |
|---|---|
| `src/lib/mock-data.ts` | All Persian strings translated to English; all timestamps updated to relative-from-now for realistic freshness; user names transliterated |

### Pages
| File | Change |
|---|---|
| `src/pages/AgentsPage.tsx` | Full R10.16: English, telemetry freshness summary bar, policy sync state banner, connect/install guidance panel (shown on empty filter results) |
| `src/pages/AgentDetailPage.tsx` | Full R10.16: English, telemetry freshness indicator, unavailable state panel with recovery steps for error/offline agents, metrics section dimmed when unavailable |
| `src/pages/MotherPage.tsx` | Full R10.16: English, Mother Core operational status banner (primary elected / attention required), storage posture per node (Healthy / Warning / Critical), heartbeat age indicator, raw JSON drawer per node |
| `src/pages/ReleasePage.tsx` | Full R10.16: English, gate posture summary card (blocked/clear), deploy/rollback/pause action buttons removed, raw JSON drawer for release object |
| `src/pages/PolicyPage.tsx` | Full R10.16: English, policy sync state banner (synced / stale), policy posture badge (Enforced / Partial / Open) in topbar actions, raw JSON drawer per policy |
| `src/pages/DiagnosticsPage.tsx` | Full R10.16: English, system posture summary (ShieldCheck / ShieldAlert), alert posture collapsible panel grouped by severity, checks grouped by component, last-run timestamp, raw JSON drawer |

---

## Feature Detail

### Telemetry Freshness (Agents)
- AgentCard shows a per-card badge: **Live** (<2 min), **Xm ago** (2–9 min), stale orange (10–59 min), stale red (≥1 hr)
- AgentsPage shows a summary bar: live / recent / stale counts with auto-refresh note
- AgentDetailPage shows a freshness row inside the header card with last-seen timestamp

### Policy Sync State
- AgentsPage shows a banner indicating how many agents are in sync with the current policy set
- PolicyPage shows a sync state banner with last-change age and sync interval

### Connect / Install Guidance
- AgentsPage: when zero agents match a filter, shows a panel with expandable install instructions (CLI commands, token reference, wait time)
- AgentDetailPage: when agent is error or offline, shows an "Unavailable" panel with recovery steps specific to the error type

### Agent Detail — Overview & Unavailable States
- Added `UnavailablePanel` component rendered above the header card for error/offline agents
- Metrics section is visually dimmed (opacity + pointer-events-none) when agent is unavailable
- Breadcrumb and not-found state updated to English with proper icon

### Mother Core Status
- Operational banner shows primary node, election state, total connected agents
- Storage posture per node: Healthy / Warning / Critical label + colored progress bar
- Heartbeat age shown live (Xs ago / Xm ago) with color change if stale

### Release Gate Posture
- `GatePostureSummary` card above the release panel shows blocked/clear state, pass count, rollout %, and guidance text
- `ReleaseGatePanel` now includes a gate posture inline banner
- Deploy / Rollback / Pause action buttons removed per R10.16 rules

### Diagnostics & Alert Posture
- Checks are now grouped by component with a header row showing component name and issue indicator
- `AlertPosturePanel` is a collapsible section showing open alerts grouped by severity with raw JSON access
- Last-run timestamp shown in topbar actions alongside re-run button

---

## Rules Compliance

| Rule | Status |
|---|---|
| UI/design only | ✅ |
| Auth/RBAC/API/runtime unchanged | ✅ |
| Mother/Agent/PHP Gateway unchanged | ✅ |
| English + LTR only | ✅ |
| No Persian text | ✅ |
| No Google fonts / CDN | ✅ |
| No AI mock terms | ✅ |
| Browser does not fetch Mother directly | ✅ |
| Raw JSON only inside drawer/collapse | ✅ |
| No deploy/rollback/enforcement/remote-command actions | ✅ |

---

## Build

```
pnpm run build
```

Artifact: `exports/unixsee_campaign_gateway-r10.16-mother-agent-product-surface.zip`
