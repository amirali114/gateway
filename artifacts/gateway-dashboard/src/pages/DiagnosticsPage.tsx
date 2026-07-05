import { useQuery } from "@tanstack/react-query";
import { apiGet, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { ErrorState } from "@/components/ErrorState";
import { StatusPill, type PillTone } from "@/components/StatusPill";
import type { 
  ReadyResponse,
  MotherAgentsResponse,
  MotherDiagnosticsSummaryResponse,
  MotherStorageStatusResponse,
  MotherAlertSummaryResponse,
  MotherHealthReportResponse,
  HealthResponse
} from "@/lib/types";

export default function DiagnosticsPage() {
  const { auth, loading: authLoading } = useAuth();

  const healthQuery = useQuery({ queryKey: ["mother/health"], queryFn: () => apiGet<HealthResponse>("mother/health") });
  const readyQuery = useQuery({ queryKey: ["mother/ready"], queryFn: () => apiGet<ReadyResponse>("mother/ready") });
  const agentsQuery = useQuery({ queryKey: ["mother/agents"], queryFn: () => apiGet<MotherAgentsResponse>("mother/agents") });
  const summaryQuery = useQuery({ queryKey: ["mother/diagnostics/summary"], queryFn: () => apiGet<MotherDiagnosticsSummaryResponse>("mother/diagnostics/summary") });
  const storageQuery = useQuery({ queryKey: ["mother/storage-status"], queryFn: () => apiGet<MotherStorageStatusResponse>("mother/storage-status") });
  const alertsQuery = useQuery({ queryKey: ["mother/alerts/summary"], queryFn: () => apiGet<MotherAlertSummaryResponse>("mother/alerts/summary") });
  const reportQuery = useQuery({ queryKey: ["mother/health-report"], queryFn: () => apiGet<MotherHealthReportResponse>("mother/health-report") });

  if (authLoading || healthQuery.isLoading || readyQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("diagnostics.view"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to view diagnostics." />;
  }

  function pct(value: unknown): string { const n = Number(value || 0); return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—"; }

  function diagnosticsOverall(healthOk?: boolean, readyOk?: boolean, critical?: number): { label: string; tone: PillTone; heroBadgeTone: "success" | "warning" | "danger"; sub: string } {
    if (!healthOk || !readyOk) {
      return { label: "Unavailable", tone: "danger", heroBadgeTone: "danger", sub: "Mother could not be reached — the readings below reflect the last safe fallback." };
    }
    if ((critical || 0) > 0) {
      return { label: "Attention needed", tone: "danger", heroBadgeTone: "danger", sub: `${critical} critical alert${(critical || 0) === 1 ? "" : "s"} require review below.` };
    }
    return { label: "Nominal", tone: "success", heroBadgeTone: "success", sub: "Mother is healthy and no critical alerts are active." };
  }

  const health = read(healthQuery.data || { ok: false, error: "" });
  const ready = read(readyQuery.data || { ok: false, error: "" });
  const summary = read(summaryQuery.data || { ok: false, error: "" })?.summary;
  const agents = read(agentsQuery.data || { ok: false, error: "" })?.agents || [];
  const storage = read(storageQuery.data || { ok: false, error: "" });
  const alerts = read(alertsQuery.data || { ok: false, error: "" });
  const report = read(reportQuery.data || { ok: false, error: "" });
  const overall = diagnosticsOverall(health?.ok, ready?.ok, alerts?.critical);

  const byScope = alerts?.by_scope || {};
  const scopeEntries = Object.entries(byScope).sort(([, a]: [string, any], [, b]: [string, any]) => (b as number) - (a as number));

  const configsPublished = summary?.configs_published_total ?? 0;
  const configsPending = summary?.configs_pending_delivery ?? 0;
  const configsAcknowledged = summary?.configs_acknowledged ?? 0;
  const configsStale = summary?.configs_stale ?? 0;
  const rollbacksTotal = summary?.rollbacks_total ?? 0;
  const hasRolloutData = configsPublished > 0 || configsPending > 0 || configsAcknowledged > 0;

  return (
    <>
      <PageHeader eyebrow="Observability" title="Diagnostics" description="Safe operational summary from Mother. Secrets, tokens, and cookies are not displayed." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Evidence only.</b> Every value below is read live from the local Mother API on the server. No secrets, tokens, or cookies are ever rendered, and no remote-command action exists on this page.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${overall.heroBadgeTone}`}>⌁</div>
          <div>
            <div className="hero-label">Diagnostics status</div>
            <div className="hero-value"><StatusPill tone={overall.tone}>{overall.label}</StatusPill></div>
            <p className="hero-sub">{overall.sub}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Agents</span><b>{summary?.total_agents ?? 0}</b></div>
          <div className="hero-stat"><span>Match rate</span><b>{pct(summary?.average_match_rate)}</b></div>
          <div className="hero-stat"><span>Storage</span><b>{valueOrDash(storage?.engine)}</b></div>
          <div className="hero-stat"><span>Critical alerts</span><b>{alerts?.critical ?? 0}</b></div>
        </div>
      </div>

      <div className="grid kpis">
        <KpiCard title="Mother health" value={<StatusPill value={health?.ok ? "healthy" : "unavailable"} />} icon="◎" tone={health?.ok ? "success" : "danger"} />
        <KpiCard title="Mother ready" value={<StatusPill value={ready?.ok ? "ready" : "not-ready"} />} hint={valueOrDash(ready?.storage)} icon="✓" tone={ready?.ok ? "success" : "warning"} />
        <KpiCard title="Storage" value={<StatusPill value={storage?.engine || "unknown"} />} hint={storage?.writable ? "Writable" : "Not writable or unknown"} icon="▣" tone={storage?.writable ? "success" : "warning"} />
        <KpiCard title="Match rate" value={pct(summary?.average_match_rate)} icon="⌁" />
        <KpiCard title="Fresh / stale / missing" value={`${summary?.telemetry_fresh ?? 0} / ${summary?.telemetry_stale ?? 0} / ${summary?.telemetry_missing ?? 0}`} icon="◉" />
        <KpiCard title="Critical alerts" value={alerts?.critical ?? 0} icon="!" tone={(alerts?.critical || 0) > 0 ? "danger" : "success"} />
      </div>

      <SectionCard title="Alert posture" description="Active alert counts by severity and scope. Resolved counts cover the last 24 hours.">
        <div className="pulse-grid">
          <div className="pulse-item"><div className="pulse-item-head"><span>Critical</span><StatusPill tone={(alerts?.critical || 0) > 0 ? "danger" : "success"}>{alerts?.critical || 0}</StatusPill></div><div className="pulse-item-value">{alerts?.critical ?? 0}</div><div className="pulse-item-note">Active, highest severity</div></div>
          <div className="pulse-item"><div className="pulse-item-head"><span>Warning</span><StatusPill tone={(alerts?.warn || 0) > 0 ? "warning" : "success"}>{alerts?.warn || 0}</StatusPill></div><div className="pulse-item-value">{alerts?.warn ?? 0}</div><div className="pulse-item-note">Active, needs review</div></div>
          <div className="pulse-item"><div className="pulse-item-head"><span>Info</span><StatusPill tone="neutral">{alerts?.info || 0}</StatusPill></div><div className="pulse-item-value">{alerts?.info ?? 0}</div><div className="pulse-item-note">Active, informational</div></div>
          <div className="pulse-item"><div className="pulse-item-head"><span>Resolved (24h)</span><StatusPill tone="success">{alerts?.resolved_24h || 0}</StatusPill></div><div className="pulse-item-value">{alerts?.resolved_24h ?? 0}</div><div className="pulse-item-note">Closed out in the last day</div></div>
        </div>
        {alerts?.muted ? <p className="small-muted" style={{ marginTop: 12 }}>{alerts.muted} alert{alerts.muted === 1 ? "" : "s"} currently muted.</p> : null}

        {scopeEntries.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="small-muted" style={{ marginBottom: 8 }}>Active alerts by scope:</div>
            <DataTable>
              <thead><tr><th>Scope</th><th>Active count</th></tr></thead>
              <tbody>
                {scopeEntries.map(([scope, count]) => (
                  <tr key={scope}>
                    <td className="mono">{scope}</td>
                    <td><StatusPill tone={(count as number) > 0 ? "warning" : "success"}>{String(count)}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}

        {(alerts?.latest?.length ?? 0) > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="small-muted" style={{ marginBottom: 8 }}>Most recent alerts:</div>
            <DataTable>
              <thead><tr><th>Severity</th><th>Scope</th><th>Title</th><th>Last seen</th></tr></thead>
              <tbody>
                {alerts!.latest!.slice(0, 8).map((a) => (
                  <tr key={a.id || a.fingerprint}>
                    <td><StatusPill value={a.severity || "info"} /></td>
                    <td>{valueOrDash(a.scope)}</td>
                    <td>{valueOrDash(a.title)}</td>
                    <td className="mono">{valueOrDash(a.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Storage detail" description="Persistence engine health as reported by Mother.">
        <table className="kv"><tbody>
          <tr><th>Engine</th><td><StatusPill value={storage?.engine || "unknown"} /></td></tr>
          <tr><th>Writable</th><td><StatusPill value={storage?.writable ? "true" : "false"} /></td></tr>
          <tr><th>Last load</th><td className="mono">{valueOrDash(storage?.last_load_at)}</td></tr>
          <tr><th>Last save</th><td className="mono">{valueOrDash(storage?.last_save_at)}</td></tr>
          {storage?.database_connected !== undefined ? <tr><th>Database connected</th><td><StatusPill value={storage.database_connected ? "true" : "false"} /></td></tr> : null}
          {storage?.schema_version !== undefined ? <tr><th>Schema version</th><td>{valueOrDash(storage.schema_version)}</td></tr> : null}
          {storage?.migration_status ? <tr><th>Migration status</th><td><StatusPill value={storage.migration_status} /></td></tr> : null}
          {storage?.last_error ? <tr><th>Last error</th><td>{storage.last_error}</td></tr> : null}
        </tbody></table>
      </SectionCard>

      {hasRolloutData && (
        <SectionCard title="Config rollout posture" description="Control-plane config delivery and acknowledgment state across the fleet.">
          <div className="pulse-grid">
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Published</span><StatusPill tone="neutral">{configsPublished}</StatusPill></div>
              <div className="pulse-item-value">{configsPublished}</div>
              <div className="pulse-item-note">Total configs published</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Pending delivery</span><StatusPill tone={configsPending > 0 ? "warning" : "neutral"}>{configsPending}</StatusPill></div>
              <div className="pulse-item-value">{configsPending}</div>
              <div className="pulse-item-note">Awaiting agent delivery</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Acknowledged</span><StatusPill tone={configsAcknowledged > 0 ? "success" : "neutral"}>{configsAcknowledged}</StatusPill></div>
              <div className="pulse-item-value">{configsAcknowledged}</div>
              <div className="pulse-item-note">Agent confirmed receipt</div>
            </div>
            <div className="pulse-item">
              <div className="pulse-item-head"><span>Stale / failed</span><StatusPill tone={configsStale > 0 ? "danger" : "neutral"}>{configsStale}</StatusPill></div>
              <div className="pulse-item-value">{configsStale}</div>
              <div className="pulse-item-note">Delivery failed or version mismatch</div>
            </div>
          </div>
          {rollbacksTotal > 0 && (
            <p className="small-muted" style={{ marginTop: 12 }}>{rollbacksTotal} rollback{rollbacksTotal === 1 ? "" : "s"} recorded in Mother's config history.</p>
          )}
          <div className="readonly-banner" style={{ marginTop: 12 }}>
            <span>◈</span>
            <span>Config delivery state is read-only here. No publish, rollback, or push action is available from this dashboard.</span>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Agent diagnostics snapshot">
        {agents.length ? <DataTable><thead><tr><th>Agent</th><th>Status</th><th>Telemetry</th><th>Received</th><th>Mismatched</th><th>Last seen</th></tr></thead><tbody>{agents.map((a: any, index: number) => <tr key={a.agent_id || `agent-diag-${index}`}><td className="mono">{valueOrDash(a.agent_id)}</td><td><StatusPill value={a.status || "unknown"} /></td><td><StatusPill value={a.telemetry_status || "missing"} /></td><td>{valueOrDash(a.last_received)}</td><td>{valueOrDash(a.last_mismatched)}</td><td className="mono">{valueOrDash(a.last_seen_at)}</td></tr>)}</tbody></DataTable> : <EmptyState title="No agent diagnostics yet" />}
      </SectionCard>

      <SectionCard title="Release safety signals" description="Read-only posture flags surfaced by the health report — no controls are exposed here.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">◈</span><span className="checklist-card-text">Backup / restore: <StatusPill value={report?.backup_restore_status || "unknown"} /></span></div>
          <div className="checklist-card"><span className="checklist-card-icon">◈</span><span className="checklist-card-text">Shadow-only safety: <StatusPill value={report?.shadow_only_safety_status || "unknown"} /></span></div>
          <div className="checklist-card"><span className="checklist-card-icon">◈</span><span className="checklist-card-text">Public exposure: <StatusPill value={report?.public_exposure_status || "unknown"} /></span></div>
          <div className="checklist-card"><span className="checklist-card-icon">◈</span><span className="checklist-card-text">Recent critical events: {report?.recent_critical_events?.length ?? 0}</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={{ healthResult: healthQuery.data, readyResult: readyQuery.data, storageResult: storageQuery.data, summaryResult: summaryQuery.data, alertsResult: alertsQuery.data, reportResult: reportQuery.data }} title="Raw diagnostic payloads" />
    </>
  );
}
