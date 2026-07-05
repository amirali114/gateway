import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiGet, read, valueOrDash, asRecord } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import type { 
  MotherAgentResponse, 
  MotherPolicyAssignmentResponse, 
  MotherControlPlaneResponse, 
  MotherConfigResponse, 
  MotherConfigHistoryResponse, 
  MotherConfigVersionsResponse, 
  MotherTelemetryResponse, 
  MotherDiagnosticsResponse, 
  MotherEventsResponse, 
  MotherAlertsResponse,
  UnknownRecord
} from "@/lib/types";

export default function AgentDetailPage() {
  const { agent_id } = useParams<{ agent_id: string }>();
  const agentId = decodeURIComponent(agent_id || "");
  const { auth, loading: authLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: ["mother/agents", agentId],
    queryFn: () => apiGet<MotherAgentResponse>(`mother/agents/${encodeURIComponent(agentId)}`),
  });

  const assignmentQuery = useQuery({
    queryKey: ["mother/policy/assignment", agentId],
    queryFn: () => apiGet<MotherPolicyAssignmentResponse>(`mother/policy/assignment/${encodeURIComponent(agentId)}`),
  });

  const controlQuery = useQuery({
    queryKey: ["mother/control-plane", agentId],
    queryFn: () => apiGet<MotherControlPlaneResponse>(`mother/control-plane/${encodeURIComponent(agentId)}`),
  });

  const configQuery = useQuery({
    queryKey: ["mother/config", agentId],
    queryFn: () => apiGet<MotherConfigResponse>(`mother/config/${encodeURIComponent(agentId)}`),
  });

  const historyQuery = useQuery({
    queryKey: ["mother/config/history", agentId],
    queryFn: () => apiGet<MotherConfigHistoryResponse>(`mother/config/history/${encodeURIComponent(agentId)}`),
  });

  const versionsQuery = useQuery({
    queryKey: ["mother/config/versions", agentId],
    queryFn: () => apiGet<MotherConfigVersionsResponse>(`mother/config/versions/${encodeURIComponent(agentId)}`),
  });

  const telemetryQuery = useQuery({
    queryKey: ["mother/telemetry", agentId],
    queryFn: () => apiGet<MotherTelemetryResponse>(`mother/telemetry/${encodeURIComponent(agentId)}`),
  });

  const diagnosticsQuery = useQuery({
    queryKey: ["mother/diagnostics", agentId],
    queryFn: () => apiGet<MotherDiagnosticsResponse>(`mother/diagnostics/${encodeURIComponent(agentId)}`),
  });

  const eventsQuery = useQuery({
    queryKey: ["mother/events", agentId],
    queryFn: () => apiGet<MotherEventsResponse>(`mother/events/${encodeURIComponent(agentId)}`),
  });

  const alertsQuery = useQuery({
    queryKey: ["mother/alerts", { status: "active", agent_id: agentId, limit: 100 }],
    queryFn: () => apiGet<MotherAlertsResponse>("mother/alerts", { status: "active", agent_id: agentId, limit: 100 }),
  });

  if (authLoading || detailQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("agents.view"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to view agent details." />;
  }

  const detailResult = detailQuery.data;
  if (!detailResult || !detailResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Agent detail"
          title={agentId}
          description="Read-only operational detail for a shadow-only Gateway Agent."
          actions={<Link className="button-link button-secondary" href="/agents">Back to registry</Link>}
          meta={<StatusPill tone="danger">Unavailable</StatusPill>}
        />
        <div className="section-block">
          <SectionCard title="Agent unavailable" description="Mother could not return data for this agent ID.">
            <ErrorState error={detailResult?.error || "Failed to fetch agent details"} />
            <div className="checklist-cards" style={{ marginTop: 16 }}>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">The agent may not be registered yet — check the <Link href="/agents">registry</Link> for the current fleet list.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Mother must be reachable from the dashboard server. Check <Link href="/diagnostics">Diagnostics</Link> for Mother health.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">No action is taken from this dashboard. Confirm the agent ID and retry, or check <Link href="/mother">Mother Core</Link>.</span>
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

  const detail = read(detailResult);
  const assignmentResult = assignmentQuery.data;
  const controlResult = controlQuery.data;
  const configResult = configQuery.data;
  const historyResult = historyQuery.data;
  const versionsResult = versionsQuery.data;
  const telemetryResult = telemetryQuery.data;
  const diagnosticsResult = diagnosticsQuery.data;
  const eventsResult = eventsQuery.data;
  const alertsResult = alertsQuery.data;

  const telemetry = read(telemetryResult || { ok: false, error: "" })?.telemetry;
  const telemetryPayload = asRecord(telemetry?.payload);
  const comparison = asRecord(telemetryPayload.comparison);
  const active = asRecord(read(configResult || { ok: false, error: "" })?.active_config || read(controlResult || { ok: false, error: "" })?.active_config);
  const versions = read(versionsResult || { ok: false, error: "" })?.versions || [];
  const events = read(eventsResult || { ok: false, error: "" })?.events || [];
  const alerts = read(alertsResult || { ok: false, error: "" })?.alerts || [];
  const status = detail?.agent?.status || "unknown";
  const connectionTone = status === "online" ? "success" : status === "stale" ? "warning" : "neutral";
  const mismatched = Number(comparison.mismatched || detail?.agent?.last_mismatched || 0);
  const telemetryStatus = detail?.agent?.telemetry_status || (telemetry ? "fresh" : "missing");
  const configSyncStatus = detail?.agent?.config_sync_status || "unknown";

  const isUnavailablePosture = status === "stale" || status === "unknown";

  function hasKeys(v: UnknownRecord): boolean { return Object.keys(v).length > 0; }

  return (
    <>
      <PageHeader
        eyebrow="Agent detail"
        title={agentId}
        description="Read-only operational detail for a shadow-only Gateway Agent."
        actions={
          <>
            <Link className="button-link button-secondary" href="/agents">Back</Link>
            <Link className="button-link" href={`/gateway?agent_id=${encodeURIComponent(agentId)}`}>Gateway view</Link>
          </>
        }
        meta={<StatusPill value={status} />}
      />

      {isUnavailablePosture && (
        <div className={`readonly-banner ${status === "stale" ? "tone-warning" : "tone-neutral"}`}>
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
          <div className="hero-stat"><span>Assignment</span><StatusPill value={read(assignmentResult || { ok: false, error: "" })?.assigned ? "active" : "unknown"} /></div>
        </div>
      </section>

      <div className="grid kpis">
        <KpiCard title="Policy pulls" value={valueOrDash(detail?.agent?.pull_count)} hint={valueOrDash(detail?.agent?.last_policy_pull_at)} icon="↻" />
        <KpiCard title="Config version" value={valueOrDash(detail?.agent?.active_config_version)} hint={valueOrDash(detail?.agent?.active_config_hash)} icon="▣" />
        <KpiCard title="Received" value={valueOrDash(comparison.received || detail?.agent?.last_received)} icon="⌁" />
        <KpiCard title="Mismatched" value={valueOrDash(comparison.mismatched || detail?.agent?.last_mismatched)} icon="!" tone={mismatched > 0 ? "warning" : "success"} />
      </div>

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
