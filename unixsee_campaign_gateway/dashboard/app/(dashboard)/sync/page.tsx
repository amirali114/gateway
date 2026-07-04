import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import type { PillTone } from "../../../components/StatusPill";
import { getMotherAgents, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requirePermission("agents.view");
  const agentsResult = await getMotherAgents();
  const agents = read(agentsResult)?.agents || [];
  const inSync = agents.filter((a) => a.config_sync_status === "in-sync" || a.config_sync_status === "synced" || a.config_sync_status === "ok").length;
  const stale = agents.filter((a) => a.config_sync_status && !["in-sync", "synced", "ok", "unknown"].includes(a.config_sync_status)).length;
  const unknown = agents.length - inSync - stale;
  const totalPulls = agents.reduce((acc, a) => acc + (a.pull_count || 0), 0);
  const postureTone: PillTone = stale > 0 ? "warning" : inSync > 0 ? "success" : "neutral";
  const postureLabel = stale > 0 ? "Needs review" : inSync > 0 ? "In sync" : agents.length === 0 ? "No agents" : "Unknown";

  return (
    <>
      <PageHeader
        eyebrow="Sync"
        title="Policy Sync"
        description="Read-only sync visibility for Agent pull and config acknowledgement. No push to Agent is available."
        meta={<StatusPill tone={postureTone}>{postureLabel}</StatusPill>}
      />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Observation only.</b> This page reflects the pull and acknowledgement state Mother already recorded for each agent — it cannot trigger a push, force a resync, or send any command to an Agent.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${stale > 0 ? "warning" : inSync > 0 ? "success" : ""}`}>⇄</div>
          <div>
            <div className="hero-label">Sync posture</div>
            <div className="hero-value">{agents.length} agent{agents.length === 1 ? "" : "s"} tracked</div>
            <p className="hero-sub">Pull and acknowledgement timestamps are read directly from Mother. Nothing on this page can push a policy or config to an Agent.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>In sync</span><b>{inSync}</b></div>
          <div className="hero-stat"><span>Stale / error</span><b>{stale}</b></div>
          <div className="hero-stat"><span>Unknown</span><b>{unknown}</b></div>
          <div className="hero-stat"><span>Push available</span><b>No</b></div>
        </div>
      </div>

      <div className="grid kpis">
        <KpiCard title="In sync" value={inSync} hint="acknowledged by agent" icon="✓" tone={inSync > 0 && stale === 0 ? "success" : "neutral"} />
        <KpiCard title="Stale / error" value={stale} hint="delivery failed or version mismatch" icon="!" tone={stale > 0 ? "warning" : "success"} />
        <KpiCard title="Unknown" value={unknown} hint="no sync status received yet" icon="?" tone="neutral" />
        <KpiCard title="Total policy pulls" value={totalPulls} hint="aggregate pull count across fleet" icon="↻" tone="blue" />
      </div>

      <div className="section-block">
        <SectionCard title="Agent sync states" description="Policy pull and config acknowledgement recorded per agent.">
          {agents.length ? (
            <DataTable>
              <thead><tr><th>Agent</th><th>Policy pull</th><th>Policy version</th><th>Config delivered</th><th>Config acknowledged</th><th>Sync status</th><th>Pull count</th></tr></thead>
              <tbody>
                {agents.map((a, index) => (
                  <tr key={a.agent_id || `agent-sync-${index}`}>
                    <td className="mono">
                      {a.agent_id ? <a href={`/agents/${encodeURIComponent(a.agent_id)}`}>{a.agent_id}</a> : "—"}
                    </td>
                    <td className="mono">{valueOrDash(a.last_policy_pull_at)}</td>
                    <td>{valueOrDash(a.last_policy_version)}</td>
                    <td className="mono">{valueOrDash(a.last_config_delivered_at)}</td>
                    <td className="mono">{valueOrDash(a.last_config_ack_at)}</td>
                    <td><StatusPill value={a.config_sync_status || "unknown"} /></td>
                    <td>{valueOrDash(a.pull_count)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState
              tone="info"
              icon="⇄"
              title="No sync data"
              description="Agents will appear after their first policy pull or telemetry push. See the Agents page for install guidance."
            />
          )}
        </SectionCard>
      </div>

      <RawJsonDrawer data={agentsResult.ok ? agentsResult.data : agentsResult} title="Raw sync payload" />
    </>
  );
}
