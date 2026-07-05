import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { ReleaseGatePanel, ReleaseSummaryStrip, normalizedReleaseLabel, releaseReadinessTone } from "../../../components/ReleaseGatePanel";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import type { PillTone } from "../../../components/StatusPill";
import { getMotherAlerts, getMotherDiagnosticsSummary, getMotherHealthReport, getMotherReleaseGates, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const CHECKLIST = [
  "Package hash captured.",
  "Backup and restore drill reviewed.",
  "PHP wrapper exposure validated.",
  "Agent telemetry fresh enough for staging.",
  "Shadow-only safety confirmed.",
  "Incident response and rollback path reviewed."
];

export default async function ReleaseReadinessPage() {
  await requirePermission("release.view");
  const [gatesResult, healthReportResult, alertsResult, summaryResult] = await Promise.all([
    getMotherReleaseGates(), getMotherHealthReport(), getMotherAlerts({ status: "active", limit: 20 }), getMotherDiagnosticsSummary()
  ]);
  const gatesData = read(gatesResult);
  const gates = gatesData?.gates || [];
  const summary = gatesData?.summary;
  const alerts = read(alertsResult)?.alerts || [];
  const report = read(healthReportResult);
  const diagSummary = read(summaryResult)?.summary;
  const label = normalizedReleaseLabel(summary);
  const tone = releaseReadinessTone(summary);
  const total = summary?.total ?? gates.length;
  const evaluated = (summary?.pass || 0) + (summary?.warn || 0) + (summary?.fail || 0) + (summary?.skipped || 0) + (summary?.unknown || 0);
  const blockerGates = [...(summary?.blockers || []), ...gates.filter((g) => g.status === "fail")];
  const heroDescription =
    label === "Ready"
      ? "All release gates evaluated by Mother are passing. No blockers are currently reported."
      : label === "Conditional"
        ? "No hard blockers, but warnings or unresolved checks require operator review before proceeding."
        : label === "Blocked"
          ? "One or more release gates are failing. Rollout must not proceed until blockers are resolved."
          : "Mother has not returned enough evidence to determine readiness yet.";

  /* R10.16: Release gate posture signals from health report */
  const backupStatus = report?.backup_restore_status || "unknown";
  const shadowStatus = report?.shadow_only_safety_status || "unknown";
  const exposureStatus = report?.public_exposure_status || "unknown";
  const recentCritical = report?.recent_critical_events?.length ?? 0;
  const gateSummaryFromReport = report?.release_gate_summary || summary;

  function postureTone(value: string): PillTone {
    if (value === "ok" || value === "pass" || value === "confirmed") return "success";
    if (value === "unknown") return "neutral";
    return "warning";
  }

  /* R10.16: Telemetry posture for release readiness */
  const telemetryFresh = diagSummary?.telemetry_fresh ?? 0;
  const telemetryTotal = diagSummary?.total_agents ?? 0;
  const telemetryMissing = diagSummary?.telemetry_missing ?? 0;
  const telemetryPostureTone: PillTone = telemetryMissing > 0 ? "warning" : telemetryFresh > 0 ? "success" : "neutral";
  const telemetryFreshPct = telemetryTotal > 0 ? ((telemetryFresh / telemetryTotal) * 100).toFixed(0) : "—";

  return (
    <>
      <PageHeader
        eyebrow="Controlled beta"
        title="Release Readiness"
        description="Operational go/no-go evidence gathered from Mother. This page does not enable enforcement, rollback, or remote command execution."
        meta={<StatusPill tone={tone}>{label}</StatusPill>}
      />

      <div className="readonly-banner">
        <span>&#9432;</span>
        <span>Read-only evidence view. <b>No release action, rollback, or enforcement toggle is available from this dashboard.</b></span>
      </div>

      <section className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${tone === "neutral" ? "" : tone}`}>&#9678;</div>
          <div>
            <div className="hero-label">Go / No-Go</div>
            <div className="hero-value">{label}</div>
            <div className="hero-sub">{heroDescription}</div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Pass</span><b>{summary?.pass ?? 0}</b></div>
          <div className="hero-stat"><span>Warn</span><b>{summary?.warn ?? 0}</b></div>
          <div className="hero-stat"><span>Fail</span><b>{summary?.fail ?? 0}</b></div>
          <div className="hero-stat"><span>Evaluated</span><b>{evaluated}/{total || evaluated}</b></div>
        </div>
      </section>

      {/* R10.16: Release gate posture strip */}
      <div className="section-block">
        <SectionCard title="Release gate posture" description="Aggregated gate evidence from Mother. All signals are read-only — no gate can be overridden from this dashboard.">
          <ReleaseSummaryStrip summary={gateSummaryFromReport} />
          <div style={{ marginTop: 20 }}>
            <div className="checklist-cards">
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Backup / restore: <StatusPill tone={postureTone(backupStatus)}>{backupStatus}</StatusPill></span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Shadow-only safety: <StatusPill tone={postureTone(shadowStatus)}>{shadowStatus}</StatusPill></span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Public exposure: <StatusPill tone={postureTone(exposureStatus)}>{exposureStatus}</StatusPill></span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">
                  Telemetry freshness: <StatusPill tone={telemetryPostureTone}>{telemetryFresh}/{telemetryTotal} fresh ({telemetryFreshPct}%)</StatusPill>
                </span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">
                  Recent critical events: <StatusPill tone={recentCritical > 0 ? "danger" : "success"}>{recentCritical}</StatusPill>
                </span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">
                  Active alerts: <StatusPill tone={alerts.length > 0 ? "warning" : "success"}>{alerts.length} open</StatusPill>
                </span>
              </div>
            </div>
          </div>
          {summary?.generated_at && (
            <p className="small-muted" style={{ marginTop: 12 }}>Gate evidence generated at: <span className="mono">{summary.generated_at}</span></p>
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <SectionCard title="Release gates" description="All gate evidence returned by Mother, grouped by outcome severity.">
          {gatesResult.ok ? <ReleaseGatePanel gates={gates} grouped /> : <ErrorState error={gatesResult.error} />}
        </SectionCard>
      </div>

      <div className="grid two section-block">
        <SectionCard title="Active release blockers" description="Gates that must be resolved before this rollout can proceed.">
          {blockerGates.length ? <ReleaseGatePanel gates={blockerGates} /> : <EmptyState tone="info" icon="✓" title="No active blockers" description="No failing gates are currently reported for this environment." />}
        </SectionCard>
        <SectionCard title="Active alerts" description="Open alerts that may affect release confidence.">
          {alerts.length ? (
            <DataTable>
              <thead><tr><th>Severity</th><th>Scope</th><th>Agent</th><th>Title</th><th>Last seen</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id || a.fingerprint}>
                    <td><StatusPill value={a.severity || "info"} /></td>
                    <td>{valueOrDash(a.scope)}</td>
                    <td className="mono">{valueOrDash(a.agent_id)}</td>
                    <td>{valueOrDash(a.title)}</td>
                    <td className="mono">{valueOrDash(a.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState tone="info" icon="✓" title="No active alerts" description="No open alerts are currently reported for this environment." />
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <SectionCard title="Controlled beta checklist" description="Manual operator checklist for human sign-off; no write action is performed from this page.">
          <div className="checklist-cards">
            {CHECKLIST.map((item) => (
              <div className="checklist-card" key={item}>
                <span className="checklist-card-icon">✓</span>
                <span className="checklist-card-text">{item}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={{ gates: gatesResult.ok ? gatesResult.data : gatesResult, health_report: healthReportResult.ok ? healthReportResult.data : healthReportResult }} title="Raw release evidence" />
      </div>
    </>
  );
}
