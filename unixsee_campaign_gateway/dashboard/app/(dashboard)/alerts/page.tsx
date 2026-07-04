import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import type { PillTone } from "../../../components/StatusPill";
import { getMotherAlertSummary, getMotherAlerts, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function alertsOverall(critical?: number, warn?: number): { label: string; tone: PillTone; heroBadgeTone: "success" | "warning" | "danger" } {
  if ((critical || 0) > 0) return { label: "Critical", tone: "danger", heroBadgeTone: "danger" };
  if ((warn || 0) > 0) return { label: "Attention", tone: "warning", heroBadgeTone: "warning" };
  return { label: "Nominal", tone: "success", heroBadgeTone: "success" };
}

export default async function AlertsPage() {
  await requirePermission("alerts.view");
  const [summaryResult, activeResult, historyResult] = await Promise.all([getMotherAlertSummary(), getMotherAlerts({ status: "active", limit: 200 }), getMotherAlerts({ limit: 100 })]);
  const summary = read(summaryResult);
  const active = read(activeResult)?.alerts || [];
  const history = read(historyResult)?.alerts || [];
  const overall = alertsOverall(summary?.critical, summary?.warn);
  const byScope = Object.entries(summary?.by_scope || {});

  return (
    <>
      <PageHeader eyebrow="Alert Center" title="Alerts" description="Internal alerts with safe metadata. Management actions are intentionally not exposed by this dashboard." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Read-only alert view.</b> Acknowledge, mute, and resolve actions are not exposed here — alert state changes only through Mother, and this page simply reflects it.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${overall.heroBadgeTone}`}>!</div>
          <div>
            <div className="hero-label">Alert posture</div>
            <div className="hero-value"><StatusPill tone={overall.tone}>{overall.label}</StatusPill></div>
            <p className="hero-sub">{summary?.active_total ?? active.length} active alert{(summary?.active_total ?? active.length) === 1 ? "" : "s"} across {byScope.length || 0} scope{byScope.length === 1 ? "" : "s"}. {summary?.resolved_24h ?? 0} resolved in the last 24 hours.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Active</span><b>{summary?.active_total ?? active.length}</b></div>
          <div className="hero-stat"><span>Critical</span><b>{summary?.critical ?? 0}</b></div>
          <div className="hero-stat"><span>Muted</span><b>{summary?.muted ?? 0}</b></div>
          <div className="hero-stat"><span>Resolved 24h</span><b>{summary?.resolved_24h ?? 0}</b></div>
        </div>
      </div>

      <div className="grid kpis">
        <KpiCard title="Active" value={summary?.active_total ?? active.length} icon="!" />
        <KpiCard title="Critical" value={summary?.critical ?? 0} icon="×" tone={(summary?.critical || 0) > 0 ? "danger" : "success"} />
        <KpiCard title="Warn" value={summary?.warn ?? 0} icon="!" tone={(summary?.warn || 0) > 0 ? "warning" : "success"} />
        <KpiCard title="Info" value={summary?.info ?? 0} icon="i" />
        <KpiCard title="Muted" value={summary?.muted ?? 0} icon="◌" />
        <KpiCard title="Resolved 24h" value={summary?.resolved_24h ?? 0} icon="✓" tone="success" />
      </div>

      <SectionCard title="Alerts by scope" description="Active alert counts grouped by the subsystem that raised them.">
        {byScope.length ? (
          <div className="pulse-grid">
            {byScope.map(([scope, count]) => (
              <div className="pulse-item" key={scope}>
                <div className="pulse-item-head"><span className="mono">{scope}</span><StatusPill tone={count > 0 ? "warning" : "success"}>{count}</StatusPill></div>
                <div className="pulse-item-value">{count}</div>
                <div className="pulse-item-note">Active alerts</div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No scope breakdown available" description="Mother has not reported per-scope alert counts yet." tone="info" />}
      </SectionCard>

      <SectionCard title="Active alerts" description="Duplicate events are grouped by Mother fingerprints.">
        {activeResult.ok ? active.length ? <DataTable><thead><tr><th>Severity</th><th>Status</th><th>Scope</th><th>Agent</th><th>Title</th><th>First seen</th><th>Last seen</th><th>Count</th></tr></thead><tbody>{active.map((a) => <tr key={a.id || a.fingerprint}><td><StatusPill value={a.severity || "info"} /></td><td><StatusPill value={a.status || "active"} /></td><td>{valueOrDash(a.scope)}</td><td className="mono">{valueOrDash(a.agent_id)}</td><td>{valueOrDash(a.title)}</td><td className="mono">{valueOrDash(a.first_seen_at)}</td><td className="mono">{valueOrDash(a.last_seen_at)}</td><td>{valueOrDash(a.occurrence_count)}</td></tr>)}</tbody></DataTable> : <EmptyState title="No active alerts" description="Telemetry, storage, and rollout issues will appear here." /> : <ErrorState error={activeResult.error} />}
      </SectionCard>

      <RawJsonDrawer data={{ summaryResult, history: history.slice(0, 20) }} title="Raw alert payloads" />
    </>
  );
}
