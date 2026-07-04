import { AgentCard } from "../../components/AgentCard";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard } from "../../components/KpiCard";
import { PageHeader } from "../../components/PageHeader";
import { RawJsonDrawer } from "../../components/RawJsonDrawer";
import { SectionCard } from "../../components/SectionCard";
import { StatusPill } from "../../components/StatusPill";
import { requirePermission } from "../../lib/auth";
import { getDashboardOverview } from "../../lib/dashboard/server-data";
import { releaseLabel } from "../../lib/dashboard/mappers";
import { valueOrDash } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requirePermission("dashboard.view");
  const overview = await getDashboardOverview();
  const overallTone = overview.alerts.critical ? "danger" : overview.alerts.warn || overview.agents.stale ? "warning" : "success";
  const overallLabel = overallTone === "success" ? "Healthy" : overallTone === "warning" ? "Needs review" : "Critical";
  const alertTone = (overview.alerts.critical || 0) > 0 ? "danger" : (overview.alerts.warn || 0) > 0 ? "warning" : "success";

  return (
    <>
      <PageHeader
        eyebrow="Unixsee Gateway"
        title="Dashboard"
        description="Operational view for the Mother-backed controlled beta. PHP Gateway remains the runtime source, Agents remain shadow-only, and the browser never talks to Mother directly."
        meta={<StatusPill tone={overallTone}>{overallLabel}</StatusPill>}
      />

      <section className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${overallTone}`}>&#9674;</div>
          <div>
            <div className="hero-label">Overall posture</div>
            <div className="hero-value">{overallLabel}</div>
            <div className="hero-sub">Combined signal from Mother health, release gates, agent freshness, and active alerts.</div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Mother</span><StatusPill value={overview.health.ok ? "healthy" : "unavailable"} /></div>
          <div className="hero-stat"><span>Agents online</span><b>{overview.agents.online}/{overview.agents.total}</b></div>
          <div className="hero-stat"><span>Release</span><StatusPill value={releaseLabel(overview.release)} /></div>
          <div className="hero-stat"><span>Safety</span><StatusPill tone="blue">Shadow</StatusPill></div>
        </div>
      </section>

      <div className="grid kpis">
        <KpiCard title="Gateway Agents" value={overview.agents.total} hint={`${overview.agents.online} online · ${overview.agents.stale} stale · ${overview.agents.unknown} unknown`} icon="◉" tone="blue" />
        <KpiCard title="Telemetry fresh" value={overview.agents.freshTelemetry} hint="agents reporting fresh telemetry to Mother" icon="⌁" />
        <KpiCard title="Active alerts" value={overview.alerts.active_total ?? 0} hint={`${overview.alerts.critical || 0} critical · ${overview.alerts.warn || 0} warn`} icon="!" tone={alertTone} />
        <KpiCard title="Safety mode" value="Shadow" hint="no enforcement · no remote commands" icon="✓" tone="success" />
      </div>

      <div className="section-block">
        <SectionCard title="System pulse" description="Health, storage, release and alert evidence combined, without exposing secrets.">
          <div className="pulse-grid">
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Mother health</span><StatusPill value={overview.health.ok ? "healthy" : "unavailable"} /></div>
              <div className="pulse-item-value">{valueOrDash(overview.health.service)}</div>
              <div className="pulse-item-note">mode: {valueOrDash(overview.health.mode)}</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Storage</span><StatusPill value={overview.ready.ok ? "ready" : "unknown"} /></div>
              <div className="pulse-item-value">{valueOrDash(overview.storage?.engine || overview.ready.engine)}</div>
              <div className="pulse-item-note">{overview.storage?.writable ? "writable" : "read-only or unknown"}</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Release gates</span><StatusPill value={releaseLabel(overview.release)} /></div>
              <div className="pulse-item-value">{overview.release.pass || 0} pass · {overview.release.warn || 0} warn · {overview.release.fail || 0} fail</div>
              <div className="pulse-item-note">{overview.release.total || 0} evaluated total</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Alert center</span><StatusPill tone={alertTone}>{alertTone === "success" ? "Clear" : alertTone === "warning" ? "Attention" : "Critical"}</StatusPill></div>
              <div className="pulse-item-value">{overview.alerts.critical || 0} critical · {overview.alerts.warn || 0} warn</div>
              <div className="pulse-item-note">{overview.alerts.resolved_24h || 0} resolved in last 24h</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid two section-block">
        <SectionCard
          title="Active agents"
          description="Latest known Agent registry entries from Mother."
          action={<a className="button-link button-secondary" href="/agents">View all</a>}
        >
          {overview.agents.items.length ? (
            <>
              <div className="agent-section-head"><span className="agent-section-count">Showing {Math.min(4, overview.agents.items.length)} of {overview.agents.items.length}</span></div>
              <div className="agent-grid">
                {overview.agents.items.slice(0, 4).map((agent, index) => (
                  <AgentCard key={agent.agent_id || `agent-${index}`} agent={agent} href={agent.agent_id ? `/agents/${encodeURIComponent(agent.agent_id)}` : undefined} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState tone="info" icon="◉" title="No agents registered yet" description="Agents will appear automatically once a policy pull or telemetry push registers them with Mother." />
          )}
        </SectionCard>
        <SectionCard title="Latest alerts" description="Alert Center summary without exposing secrets.">
          {(overview.alerts.latest || []).length ? (
            <DataTable>
              <thead><tr><th>Severity</th><th>Scope</th><th>Agent</th><th>Title</th><th>Last seen</th></tr></thead>
              <tbody>
                {(overview.alerts.latest || []).slice(0, 5).map((alert) => (
                  <tr key={alert.id || alert.fingerprint}>
                    <td><StatusPill value={alert.severity || "info"} /></td>
                    <td>{valueOrDash(alert.scope)}</td>
                    <td className="mono">{valueOrDash(alert.agent_id)}</td>
                    <td>{valueOrDash(alert.title)}</td>
                    <td className="mono">{valueOrDash(alert.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState tone="info" icon="✓" title="No active alerts" description="The Alert Center currently has no open items for this environment." />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={{ health: overview.health, ready: overview.ready, agents: overview.agents, release: overview.release, alerts: overview.alerts }} title="Raw normalized overview" />
      </div>
    </>
  );
}
