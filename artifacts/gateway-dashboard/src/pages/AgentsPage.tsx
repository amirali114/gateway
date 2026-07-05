import { useQuery } from "@tanstack/react-query";
import { apiGet, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { AgentCard } from "@/components/AgentCard";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import type { 
  MotherAgentsResponse, 
  MotherDiagnosticsSummaryResponse, 
  MotherAlertSummaryResponse 
} from "@/lib/types";

export default function AgentsPage() {
  const { auth, loading: authLoading } = useAuth();

  const agentsQuery = useQuery({
    queryKey: ["mother/agents"],
    queryFn: () => apiGet<MotherAgentsResponse>("mother/agents"),
  });

  const diagnosticsQuery = useQuery({
    queryKey: ["mother/diagnostics/summary"],
    queryFn: () => apiGet<MotherDiagnosticsSummaryResponse>("mother/diagnostics/summary"),
  });

  const alertsSummaryQuery = useQuery({
    queryKey: ["mother/alerts/summary"],
    queryFn: () => apiGet<MotherAlertSummaryResponse>("mother/alerts/summary"),
  });

  if (authLoading || agentsQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("agents.view"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to view agents." />;
  }

  function pct(v: unknown) { const n = Number(v || 0); return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—"; }

  const agentsResult = agentsQuery.data || { ok: false, error: "Failed to fetch agents" };
  const summaryResult = diagnosticsQuery.data || { ok: false, error: "" };
  const alertsResult = alertsSummaryQuery.data || { ok: false, error: "" };

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
            <div className="hero-sub">Aggregated from Mother's agent registry. Agents remain shadow-only — no remote commands are issued from this dashboard.</div>
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
                  {summary?.stale_agent_ids?.map((id) => (
                    <a key={id} href={`/agents/${encodeURIComponent(id)}`} className="status-pill tone-warning mono">{id}</a>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <div className="section-block">
        <SectionCard title="Agent registry" description="Fleet list as tracked by Mother. Select an agent for operational detail.">
          {total > 0 ? (
            <div className="grid three">
              {agents.map((a) => (
                <AgentCard key={a.agent_id} agent={a} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={agentsResult.ok ? "No agents registered" : "Registry unavailable"}
              description={agentsResult.ok ? "No Gateway Agents have connected to Mother yet." : agentsResult.error}
              tone={agentsResult.ok ? ("info" as const) : ("danger" as const)}
            />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={{ agentsResult, summaryResult, alertsResult }} title="Raw registry payloads" />
      </div>
    </>
  );
}
