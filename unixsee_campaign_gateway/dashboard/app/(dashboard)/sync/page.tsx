import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { getMotherAgents, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requirePermission("agents.view");
  const agentsResult = await getMotherAgents();
  const agents = read(agentsResult)?.agents || [];
  const inSync = agents.filter((a) => a.config_sync_status === "in-sync" || a.config_sync_status === "synced").length;
  const stale = agents.filter((a) => a.config_sync_status && !["in-sync", "synced"].includes(a.config_sync_status)).length;
  const unknown = agents.length - inSync - stale;

  return (
    <>
      <PageHeader eyebrow="Sync" title="Policy Sync" description="Read-only sync visibility for Agent pull and config acknowledgement. No push to Agent is available." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Observation only.</b> This page reflects the pull and acknowledgement state Mother already recorded for each agent — it cannot trigger a push, force a resync, or send any command to an Agent.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${stale > 0 ? "warning" : "success"}`}>⇄</div>
          <div>
            <div className="hero-label">Sync posture</div>
            <div className="hero-value">{agents.length} agent{agents.length === 1 ? "" : "s"} tracked</div>
            <p className="hero-sub">Pull and acknowledgement timestamps are read directly from Mother. Nothing on this page can push a policy or config to an Agent.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>In sync</span><b>{inSync}</b></div>
          <div className="hero-stat"><span>Stale</span><b>{stale}</b></div>
          <div className="hero-stat"><span>Unknown</span><b>{unknown}</b></div>
          <div className="hero-stat"><span>Push available</span><b>No</b></div>
        </div>
      </div>

      <SectionCard title="Agent sync states" description="Policy pull and config acknowledgement recorded per agent.">
        {agents.length ? <DataTable><thead><tr><th>Agent</th><th>Policy pull</th><th>Policy version</th><th>Config delivered</th><th>Config acknowledged</th><th>Sync status</th></tr></thead><tbody>{agents.map((a, index) => <tr key={a.agent_id || `agent-sync-${index}`}><td className="mono">{valueOrDash(a.agent_id)}</td><td className="mono">{valueOrDash(a.last_policy_pull_at)}</td><td>{valueOrDash(a.last_policy_version)}</td><td className="mono">{valueOrDash(a.last_config_delivered_at)}</td><td className="mono">{valueOrDash(a.last_config_ack_at)}</td><td><StatusPill value={a.config_sync_status || "unknown"} /></td></tr>)}</tbody></DataTable> : <EmptyState title="No sync data" description="Agents will appear after policy pull or telemetry push." />}
      </SectionCard>

      <RawJsonDrawer data={agentsResult.ok ? agentsResult.data : agentsResult} title="Raw sync payload" />
    </>
  );
}
