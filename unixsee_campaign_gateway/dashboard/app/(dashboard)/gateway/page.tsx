import { AgentSelector } from "../../../components/AgentSelector";
import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { asRecord, getMotherAgentConfig, getMotherAgentConfigDiff, getMotherAgentConfigVersions, getMotherAgents, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";
type Props = { searchParams?: Promise<{ agent_id?: string }> };
function configFrom(record: unknown) { const r = asRecord(record); return asRecord(r.config); }

export default async function GatewayPage({ searchParams }: Props) {
  await requirePermission("gateway.view");
  const sp = searchParams ? await searchParams : {};
  const agentsResult = await getMotherAgents();
  const agents = read(agentsResult)?.agents || [];
  const selectedAgent = sp.agent_id || agents[0]?.agent_id || "";
  const [cfgResult, diffResult, versionsResult] = selectedAgent ? await Promise.all([getMotherAgentConfig(selectedAgent), getMotherAgentConfigDiff(selectedAgent), getMotherAgentConfigVersions(selectedAgent)]) : [undefined, undefined, undefined] as const;
  const activeRecord = asRecord(read(cfgResult!)?.active_config);
  const draftRecord = asRecord(read(cfgResult!)?.draft_config);
  const activeConfig = configFrom(activeRecord);
  const versions = read(versionsResult!)?.versions || [];
  const dirty = Boolean(read(diffResult!)?.diff?.dirty);

  return (
    <>
      <PageHeader eyebrow="Gateway" title="Gateway Control" description="Safe read-only control-plane view. Write, publish, and rollback actions are not exposed in this dashboard." actions={<StatusPill tone="blue">Shadow-only</StatusPill>} />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>PHP Gateway is the runtime source of truth.</b> Agents run in shadow-only mode — they observe and compare, they do not enforce. This page only reflects what Mother has stored; no write, publish, or rollback action exists here.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className="hero-badge blue">▣</div>
          <div>
            <div className="hero-label">Runtime mode</div>
            <div className="hero-value"><StatusPill tone="blue">Shadow-only</StatusPill></div>
            <p className="hero-sub">Live traffic is served and decided by the PHP Gateway. Agent config below is evidence of what has been synced, not an enforcement control.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Runtime source</span><b>PHP Gateway</b></div>
          <div className="hero-stat"><span>Enforcement</span><b>None</b></div>
          <div className="hero-stat"><span>Agents registered</span><b>{agents.length}</b></div>
          <div className="hero-stat"><span>Selected agent config</span><b>{selectedAgent ? (dirty ? "Draft differs" : "In sync") : "—"}</b></div>
        </div>
      </div>

      <SectionCard title="Select agent"><AgentSelector agents={agents} selectedAgentId={selectedAgent} basePath="/gateway" /></SectionCard>

      {selectedAgent ? <>
        <div className="grid kpis" style={{ marginTop: 14 }}>
          <KpiCard title="Agent" value={<span className="mono">{selectedAgent}</span>} icon="◉" />
          <KpiCard title="Active version" value={valueOrDash(activeRecord.version)} icon="▣" />
          <KpiCard title="Draft version" value={valueOrDash(draftRecord.version)} icon="□" />
          <KpiCard title="Dirty" value={<StatusPill value={dirty} />} icon="!" tone={dirty ? "warning" : "success"} />
        </div>
        <div className="grid two" style={{ marginTop: 14 }}>
          <SectionCard title="Active config" description="Currently acknowledged configuration for this agent."><RawJsonDrawer data={activeConfig} title="Active config JSON" /></SectionCard>
          <SectionCard title="Draft diff" description="Pending differences between active and draft, if any."><RawJsonDrawer data={read(diffResult!)?.diff || diffResult} title="Diff JSON" /></SectionCard>
        </div>
        <SectionCard title="Config versions" description="History of published configuration versions. Rollback is intentionally not exposed here.">
          {versions.length ? <DataTable><thead><tr><th>Version</th><th>Status</th><th>Hash</th><th>Published</th><th>Source</th></tr></thead><tbody>{versions.map((v) => <tr key={`${v.version}-${v.config_hash}`}><td>{valueOrDash(v.version)}</td><td><StatusPill value={v.status || "unknown"} /></td><td className="mono">{valueOrDash(v.config_hash)}</td><td className="mono">{valueOrDash(v.published_at)}</td><td>{valueOrDash(v.source)}</td></tr>)}</tbody></DataTable> : <EmptyState title="No config versions" />}
        </SectionCard>
      </> : agentsResult.ok ? <EmptyState title="No agent selected" description="Register an Agent first, then return to this page." /> : <ErrorState error={agentsResult.error} />}

      <SectionCard title="Safety model" description="What this page can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">The PHP Gateway remains the authoritative runtime — it serves and decides live traffic.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Agents operate in shadow-only mode: they compare and report, they never enforce.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Config shown here reflects what Mother has stored, not a live control switch.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No write, publish, or rollback action is exposed in this dashboard.</span></div>
        </div>
      </SectionCard>
    </>
  );
}
