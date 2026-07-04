import { DataTable } from "../../../../components/DataTable";
import { EmptyState } from "../../../../components/EmptyState";
import { ErrorState } from "../../../../components/ErrorState";
import { KpiCard } from "../../../../components/KpiCard";
import { PageHeader } from "../../../../components/PageHeader";
import { RawJsonDrawer } from "../../../../components/RawJsonDrawer";
import { SectionCard } from "../../../../components/SectionCard";
import { StatusPill } from "../../../../components/StatusPill";
import { getMotherAgent, getMotherAgentConfig, getMotherAgentConfigHistory, getMotherAgentConfigVersions, getMotherAgentDiagnostics, getMotherAgentEvents, getMotherAgentTelemetry, getMotherAlerts, getMotherControlPlane, getMotherPolicyAssignment, read, valueOrDash } from "../../../../lib/api";
import { requirePermission } from "../../../../lib/auth";
import type { UnknownRecord } from "../../../../lib/types";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ agent_id: string }> };
function rec(v: unknown): UnknownRecord { return typeof v === "object" && v !== null && !Array.isArray(v) ? v as UnknownRecord : {}; }
function hasKeys(v: UnknownRecord): boolean { return Object.keys(v).length > 0; }

export default async function AgentDetailPage({ params }: Params) {
  const { agent_id } = await params;
  const agentId = decodeURIComponent(agent_id);
  await requirePermission("agents.view");
  const [detailResult, assignmentResult, controlResult, configResult, historyResult, versionsResult, telemetryResult, diagnosticsResult, eventsResult, alertsResult] = await Promise.all([
    getMotherAgent(agentId), getMotherPolicyAssignment(agentId), getMotherControlPlane(agentId), getMotherAgentConfig(agentId), getMotherAgentConfigHistory(agentId), getMotherAgentConfigVersions(agentId), getMotherAgentTelemetry(agentId), getMotherAgentDiagnostics(agentId), getMotherAgentEvents(agentId), getMotherAlerts({ status: "active", agent_id: agentId, limit: 100 })
  ]);
  const detail = read(detailResult);
  const telemetry = read(telemetryResult)?.telemetry;
  const telemetryPayload = rec(telemetry?.payload);
  const comparison = rec(telemetryPayload.comparison);
  const active = rec(read(configResult)?.active_config || read(controlResult)?.active_config);
  const versions = read(versionsResult)?.versions || [];
  const events = read(eventsResult)?.events || [];
  const alerts = read(alertsResult)?.alerts || [];
  const status = detail?.agent?.status || "unknown";
  const connectionTone = status === "online" ? "success" : status === "stale" ? "warning" : "neutral";
  const mismatched = Number(comparison.mismatched || detail?.agent?.last_mismatched || 0);
  const telemetryStatus = detail?.agent?.telemetry_status || read(telemetryResult)?.telemetry ? "fresh" : "missing";
  const configSyncStatus = detail?.agent?.config_sync_status || "unknown";

  /* R10.16: Agent unavailable — Mother could not return this agent */
  if (!detailResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Agent detail"
          title={agentId}
          description="Read-only operational detail for a shadow-only Gateway Agent."
          actions={<a className="button-link button-secondary" href="/agents">Back to registry</a>}
          meta={<StatusPill tone="danger">Unavailable</StatusPill>}
        />
        <div className="section-block">
          <SectionCard title="Agent unavailable" description="Mother could not return data for this agent ID.">
            <ErrorState error={detailResult.error} />
            <div className="checklist-cards" style={{ marginTop: 16 }}>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">The agent may not be registered yet — check the <a href="/agents">registry</a> for the current fleet list.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Mother must be reachable from the dashboard server. Check <a href="/diagnostics">Diagnostics</a> for Mother health.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">No action is taken from this dashboard. Confirm the agent ID and retry, or check <a href="/mother">Mother Core</a>.</span>
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="section-block">
          <RawJsonDrawer data={{ detailResult }} title="Raw error payload" />
        </div>
      </>
    );
  }

  /* R10.16: Offline / stale agent posture banner */
  const isUnavailablePosture = status === "stale" || status === "unknown";

  return (
    <>
      <PageHeader
        eyebrow="Agent detail"
        title={agentId}
        description="Read-only operational detail for a shadow-only Gateway Agent."
        actions={<><a className="button-link button-secondary" href="/agents">Back</a><a className="button-link" href={`/gateway?agent_id=${encodeURIComponent(agentId)}`}>Gateway view</a></>}
        meta={<StatusPill value={status} />}
      />

      {/* R10.16: Posture notice for stale/unknown agents */}
      {isUnavailablePosture && (
        <div className="readonly-banner" style={{ borderLeftColor: status === "stale" ? "var(--tone-warning, #d97706)" : "var(--tone-neutral, #6b7280)" }}>
          <span>{status === "stale" ? "!" : "?"}</span>
          <span>
            <b>Agent {status === "stale" ? "stale" : "status unknown"}.</b>{" "}
            {status === "stale"
              ? "This agent has not sent a telemetry push within its freshness window. The data below reflects the last known state. No remote command is available from this dashboard."
              : "Mother does not have a definitive status for this agent. It may not have completed its first policy pull yet."}
          </span>
        </div>
      )}

      <section className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${connectionTone === "neutral" ? "" : connectionTone}`}>&#9678;</div>
          <div>
            <div className="hero-label">Connection</div>
            <div className="detail-hero-id">{agentId}</div>
            <div className="detail-hero-meta">
              <span>Last seen <b>{valueOrDash(detail?.agent?.last_seen_at)}</b></span>
              <span>Source IP <b>{valueOrDash(detail?.agent?.last_source_ip)}</b></span>
              <span>Policy pulls <b>{valueOrDash(detail?.agent?.pull_count)}</b></span>
            </div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Telemetry</span><StatusPill value={detail?.agent?.telemetry_status || "missing"} /></div>
          <div className="hero-stat"><span>Config sync</span><StatusPill value={detail?.agent?.config_sync_status || "unknown"} /></div>
          <div className="hero-stat"><span>Assignment</span><StatusPill value={read(assignmentResult)?.assigned ? "active" : "unknown"} /></div>
        </div>
      </section>

      <div className="grid kpis">
        <KpiCard title="Policy pulls" value={valueOrDash(detail?.agent?.pull_count)} hint={valueOrDash(detail?.agent?.last_policy_pull_at)} icon="↻" />
        <KpiCard title="Config version" value={valueOrDash(detail?.agent?.active_config_version)} hint={valueOrDash(detail?.agent?.active_config_hash)} icon="▣" />
        <KpiCard title="Received" value={valueOrDash(comparison.received || detail?.agent?.last_received)} icon="⌁" />
        <KpiCard title="Mismatched" value={valueOrDash(comparison.mismatched || detail?.agent?.last_mismatched)} icon="!" tone={mismatched > 0 ? "warning" : "success"} />
      </div>

      {/* R10.16: Telemetry freshness and config sync posture */}
      <div className="grid two section-block">
        <SectionCard title="Telemetry posture" description="Freshness and arrival state of this agent's telemetry as tracked by Mother.">
          <table className="kv"><tbody>
            <tr><th>Telemetry status</th><td><StatusPill value={telemetryStatus} /></td></tr>
            <tr><th>Last push received</th><td className="mono">{valueOrDash(detail?.agent?.last_telemetry_at || telemetry?.received_at)}</td></tr>
            <tr><th>Remote address</th><td className="mono">{valueOrDash(telemetry?.remote_addr || detail?.agent?.last_source_ip)}</td></tr>
            <tr><th>Stale threshold</th><td>{detail?.agent?.stale_after_seconds != null ? `${detail.agent.stale_after_seconds}s` : "—"}</td></tr>
            <tr><th>Received count</th><td>{valueOrDash(comparison.received || detail?.agent?.last_received)}</td></tr>
            <tr><th>Mismatched</th><td><StatusPill tone={mismatched > 0 ? "warning" : "success"}>{mismatched > 0 ? String(mismatched) : "None"}</StatusPill></td></tr>
          </tbody></table>
        </SectionCard>
        <SectionCard title="Config sync posture" description="Control-plane configuration sync state between Mother and this agent.">
          <table className="kv"><tbody>
            <tr><th>Sync status</th><td><StatusPill value={configSyncStatus} /></td></tr>
            <tr><th>Active version</th><td>{valueOrDash(detail?.agent?.active_config_version)}</td></tr>
            <tr><th>Active hash</th><td className="mono">{valueOrDash(detail?.agent?.active_config_hash)}</td></tr>
            <tr><th>Delivered at</th><td className="mono">{valueOrDash(detail?.agent?.last_config_delivered_at)}</td></tr>
            <tr><th>Acknowledged version</th><td>{valueOrDash(detail?.agent?.acknowledged_config_version)}</td></tr>
            <tr><th>Ack at</th><td className="mono">{valueOrDash(detail?.agent?.last_config_ack_at)}</td></tr>
          </tbody></table>
          {configSyncStatus === "stale" || configSyncStatus === "error" ? (
            <div className="readonly-banner" style={{ marginTop: 12 }}>
              <span>!</span>
              <span>Config sync is in a degraded state. Policy assignment and config delivery are controlled through Mother — no action is available from this dashboard.</span>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid two section-block">
        <SectionCard title="Active config" description="Live control-plane configuration for this agent.">
          {hasKeys(active) ? <RawJsonDrawer data={active} title="Config JSON" /> : <EmptyState tone="info" icon="▣" title="No active config" description="No control-plane configuration has been published to this agent yet." />}
        </SectionCard>
        <SectionCard title="Latest telemetry" description="Most recent telemetry payload received by Mother.">
          {telemetry ? <RawJsonDrawer data={telemetry} title="Telemetry JSON" /> : <EmptyState tone="info" icon="⌁" title="No telemetry received" description="This agent has not sent a telemetry payload yet." />}
        </SectionCard>
      </div>

      <div className="section-block">
        <SectionCard title="Config versions" description="Version history is read-only here. No remote command is available.">
          {versions.length ? (
            <DataTable>
              <thead><tr><th>Version</th><th>Status</th><th>Hash</th><th>Published</th><th>Source</th></tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={`${v.version}-${v.config_hash}`}>
                    <td>{valueOrDash(v.version)}</td>
                    <td><StatusPill value={v.status || "unknown"} /></td>
                    <td className="mono">{valueOrDash(v.config_hash)}</td>
                    <td className="mono">{valueOrDash(v.published_at)}</td>
                    <td>{valueOrDash(v.source)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState tone="info" icon="▤" title="No config versions" description="No configuration has been published for this agent yet." />
          )}
        </SectionCard>
      </div>

      <div className="grid two section-block">
        <SectionCard title="Events" description="Most recent operational events for this agent.">
          {events.length ? (
            <DataTable>
              <thead><tr><th>Time</th><th>Severity</th><th>Type</th><th>Message</th></tr></thead>
              <tbody>
                {events.slice(0, 12).map((e) => (
                  <tr key={e.id || `${e.timestamp}-${e.type}`}>
                    <td className="mono">{valueOrDash(e.timestamp)}</td>
                    <td><StatusPill value={e.severity || "info"} /></td>
                    <td className="mono">{valueOrDash(e.type)}</td>
                    <td>{valueOrDash(e.message)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState tone="info" icon="◷" title="No recent events" description="No operational events have been recorded for this agent." />
          )}
        </SectionCard>
        <SectionCard title="Active alerts" description="Open alerts scoped to this agent.">
          {alerts.length ? (
            <DataTable>
              <thead><tr><th>Severity</th><th>Title</th><th>Last seen</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id || a.fingerprint}>
                    <td><StatusPill value={a.severity || "info"} /></td>
                    <td>{valueOrDash(a.title)}</td>
                    <td className="mono">{valueOrDash(a.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState tone="info" icon="✓" title="No active alerts" description="This agent has no open alerts." />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={{ detailResult, assignmentResult, controlResult, configResult, historyResult, diagnosticsResult }} title="Raw agent payloads" />
      </div>
    </>
  );
}
