import { AgentCard } from "../../../components/AgentCard";
import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { getMotherAgents, getMotherAlertSummary, getMotherDiagnosticsSummary, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";
function pct(v: unknown) { const n = Number(v || 0); return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—"; }

export default async function AgentsPage() {
  await requirePermission("agents.view");
  const [agentsResult, summaryResult, alertsResult] = await Promise.all([getMotherAgents(), getMotherDiagnosticsSummary(), getMotherAlertSummary()]);
  const agents = read(agentsResult)?.agents || [];
  const summary = read(summaryResult)?.summary;
  const online = summary?.online_agents ?? agents.filter((a) => a.status === "online").length;
  const stale = summary?.stale_agents ?? agents.filter((a) => a.status === "stale").length;
  const unknown = summary?.unknown_agents ?? Math.max(0, agents.length - online - stale);
  const total = agentsResult.ok ? agents.length : 0;
  const registryTone = !agentsResult.ok ? "danger" : total === 0 ? "blue" : stale > 0 || unknown > 0 ? "warning" : "success";
  const registryLabel = !agentsResult.ok ? "Unavailable" : total === 0 ? "Empty registry" : stale > 0 || unknown > 0 ? "Needs review" : "All healthy";
  const alertTone = (read(alertsResult)?.critical || 0) > 0 ? "danger" : (read(alertsResult)?.warn || 0) > 0 ? "warning" : "neutral";

  const telemetryFresh = summary?.telemetry_fresh ?? agents.filter((a) => a.telemetry_status === "fresh").length;
  const telemetryStale = summary?.telemetry_stale ?? agents.filter((a) => a.telemetry_status === "stale").length;
  const telemetryMissing = summary?.telemetry_missing ?? agents.filter((a) => !a.telemetry_status || a.telemetry_status === "missing").length;
  const telemetryTotal = total || (telemetryFresh + telemetryStale + telemetryMissing);
  const telemetryPostureTone = telemetryMissing > 0 ? "warning" : telemetryStale > 0 ? "warning" : telemetryFresh > 0 ? "success" : "neutral";

  const syncOk = agents.filter((a) => a.config_sync_status === "ok" || a.config_sync_status === "synced").length;
  const syncPending = agents.filter((a) => a.config_sync_status === "pending" || a.config_sync_status === "unknown").length;
  const syncStale = agents.filter((a) => a.config_sync_status === "stale" || a.config_sync_status === "error").length;
  const syncPostureTone = syncStale > 0 ? "danger" : syncPending > 0 ? "warning" : syncOk > 0 ? "success" : "neutral";

  return (
    <>
      <PageHeader
        eyebrow="Registry"
        title="Agents"
        description="Mother registry and telemetry aggregate. The dashboard never fetches Agents directly from the browser."
        meta={<StatusPill tone={registryTone}>{registryLabel}</StatusPill>}
      />

      <section className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${registryTone === "blue" ? "" : registryTone}`}>&#9678;</div>
          <div>
            <div className="hero-label">Registry status</div>
            <div className="hero-value">{online}/{total} online</div>
            <div className="hero-sub">Aggregated from Mother&apos;s agent registry. Agents remain shadow-only — no remote commands are issued from this dashboard.</div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Total</span><b>{total}</b></div>
          <div className="hero-stat"><span>Stale</span><b>{stale}</b></div>
          <div className="hero-stat"><span>Unknown</span><b>{unknown}</b></div>
          <div className="hero-stat"><span>Active alerts</span><b>{read(alertsResult)?.active_total ?? 0}</b></div>
        </div>
      </section>

      <div className="grid kpis">
        <KpiCard title="Fresh telemetry" value={summary?.telemetry_fresh ?? 0} hint="agents reporting within freshness window" icon="⌁" tone="success" />
        <KpiCard title="Missing telemetry" value={summary?.telemetry_missing ?? 0} hint="no recent telemetry payload" icon="!" tone={(summary?.telemetry_missing ?? 0) > 0 ? "warning" : "success"} />
        <KpiCard title="Avg match rate" value={pct(summary?.average_match_rate)} hint="policy match rate across fleet" icon="◈" tone="blue" />
        <KpiCard title="Active alerts" value={read(alertsResult)?.active_total ?? 0} hint={`${read(alertsResult)?.critical || 0} critical`} icon="▲" tone={alertTone} />
      </div>

      {/* R10.16: Telemetry freshness breakdown */}
      {agentsResult.ok && total > 0 && (
        <div className="section-block">
          <SectionCard
            title="Telemetry freshness"
            description="Distribution of telemetry state across the registered fleet. Mother determines freshness based on each agent's stale_after_seconds window."
          >
            <div className="pulse-grid">
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Fresh</span>
                  <StatusPill tone="success">{telemetryFresh}</StatusPill>
                </div>
                <div className="pulse-item-value">{telemetryTotal > 0 ? pct((telemetryFresh / telemetryTotal) * 100) : "—"}</div>
                <div className="pulse-item-note">Reported within freshness window</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Stale</span>
                  <StatusPill tone={telemetryStale > 0 ? "warning" : "success"}>{telemetryStale}</StatusPill>
                </div>
                <div className="pulse-item-value">{telemetryTotal > 0 ? pct((telemetryStale / telemetryTotal) * 100) : "—"}</div>
                <div className="pulse-item-note">Last push exceeded freshness window</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Missing</span>
                  <StatusPill tone={telemetryMissing > 0 ? "warning" : "neutral"}>{telemetryMissing}</StatusPill>
                </div>
                <div className="pulse-item-value">{telemetryTotal > 0 ? pct((telemetryMissing / telemetryTotal) * 100) : "—"}</div>
                <div className="pulse-item-note">No telemetry payload received yet</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Posture</span>
                  <StatusPill tone={telemetryPostureTone}>{telemetryPostureTone === "success" ? "Nominal" : "Needs review"}</StatusPill>
                </div>
                <div className="pulse-item-value">{telemetryFresh}/{telemetryTotal}</div>
                <div className="pulse-item-note">Fresh agents out of total registered</div>
              </div>
            </div>
            {(summary?.stale_agent_ids?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="small-muted" style={{ marginBottom: 6 }}>Stale agents:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {summary!.stale_agent_ids!.map((id) => (
                    <a key={id} className="button-link button-secondary" style={{ fontSize: "0.75rem", padding: "2px 8px" }} href={`/agents/${encodeURIComponent(id)}`}>{id}</a>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* R10.16: Policy sync state */}
      {agentsResult.ok && total > 0 && (
        <div className="section-block">
          <SectionCard
            title="Policy sync state"
            description="Config sync posture across the fleet as reported by Mother. Mother controls assignment — no sync action is available from this page."
          >
            <div className="pulse-grid">
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>In sync</span>
                  <StatusPill tone={syncOk > 0 ? "success" : "neutral"}>{syncOk}</StatusPill>
                </div>
                <div className="pulse-item-value">{syncOk}</div>
                <div className="pulse-item-note">Config acknowledged by agent</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Pending</span>
                  <StatusPill tone={syncPending > 0 ? "warning" : "neutral"}>{syncPending}</StatusPill>
                </div>
                <div className="pulse-item-value">{syncPending}</div>
                <div className="pulse-item-note">Awaiting delivery or acknowledgment</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Stale / error</span>
                  <StatusPill tone={syncStale > 0 ? "danger" : "neutral"}>{syncStale}</StatusPill>
                </div>
                <div className="pulse-item-value">{syncStale}</div>
                <div className="pulse-item-note">Config delivery failed or version mismatch</div>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-head">
                  <span>Posture</span>
                  <StatusPill tone={syncPostureTone}>{syncPostureTone === "success" ? "In sync" : syncPostureTone === "danger" ? "Action needed" : syncPostureTone === "warning" ? "Pending" : "Unknown"}</StatusPill>
                </div>
                <div className="pulse-item-value">{summary?.configs_pending_delivery ?? syncPending}</div>
                <div className="pulse-item-note">Configs pending delivery</div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      <div className="section-block">
        <SectionCard title="Agent registry" description="Click an agent to inspect telemetry, config history, events, and alerts.">
          {agentsResult.ok ? (
            agents.length ? (
              <>
                <div className="agent-section-head"><span className="agent-section-count">{agents.length} agent{agents.length === 1 ? "" : "s"} registered</span></div>
                <div className="agent-grid">
                  {agents.map((agent, index) => (
                    <AgentCard key={agent.agent_id || `agent-${index}`} agent={agent} href={agent.agent_id ? `/agents/${encodeURIComponent(agent.agent_id)}` : undefined} />
                  ))}
                </div>
              </>
            ) : (
              /* R10.16: Connect / install guidance when no agents */
              <div>
                <EmptyState tone="info" icon="◉" title="No agents registered" description="Agents appear here automatically after a policy pull or telemetry push reaches Mother." />
                <div className="checklist-cards" style={{ marginTop: 16 }}>
                  <div className="checklist-card">
                    <span className="checklist-card-icon">1</span>
                    <span className="checklist-card-text"><b>Install the agent binary</b> on each host using the build script at <span className="mono">agent/scripts/build.sh</span>.</span>
                  </div>
                  <div className="checklist-card">
                    <span className="checklist-card-icon">2</span>
                    <span className="checklist-card-text"><b>Configure Mother endpoint</b> in <span className="mono">agent/configs/agent.example.yml</span>: set <span className="mono">mother_base_url</span> to this Mother instance.</span>
                  </div>
                  <div className="checklist-card">
                    <span className="checklist-card-icon">3</span>
                    <span className="checklist-card-text"><b>Start the agent service</b> using systemd (<span className="mono">agent/systemd/unixsee-agent.service</span>) or the run script.</span>
                  </div>
                  <div className="checklist-card">
                    <span className="checklist-card-icon">4</span>
                    <span className="checklist-card-text"><b>Wait for first policy pull.</b> Mother registers the agent automatically on first contact. Refresh this page after 30–60 seconds.</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <ErrorState error={agentsResult.error} />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <SectionCard title="Registry table" description="Full fleet detail with sync and telemetry state per agent.">
          {agentsResult.ok ? (
            agents.length ? (
              <DataTable>
                <thead><tr><th>Agent ID</th><th>Status</th><th>Telemetry</th><th>Last telemetry</th><th>Match rate</th><th>Config sync</th><th>Received</th><th></th></tr></thead>
                <tbody>
                  {agents.map((agent, index) => (
                    <tr key={agent.agent_id || `agent-row-${index}`}>
                      <td className="mono">{valueOrDash(agent.agent_id)}</td>
                      <td><StatusPill value={agent.status || "unknown"} /></td>
                      <td><StatusPill value={agent.telemetry_status || "missing"} /></td>
                      <td className="mono">{valueOrDash(agent.last_telemetry_at)}</td>
                      <td>{pct(agent.last_match_rate)}</td>
                      <td><StatusPill value={agent.config_sync_status || "unknown"} /></td>
                      <td>{valueOrDash(agent.last_received)}</td>
                      <td>{agent.agent_id ? <a className="button-link button-secondary" href={`/agents/${encodeURIComponent(agent.agent_id)}`}>Open</a> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState tone="info" icon="▤" title="No rows to display" description="The registry table will populate once agents are known to Mother." />
            )
          ) : (
            <ErrorState error={agentsResult.error} />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={agentsResult.ok ? agentsResult.data : agentsResult} title="Raw Mother registry" />
      </div>
    </>
  );
}
