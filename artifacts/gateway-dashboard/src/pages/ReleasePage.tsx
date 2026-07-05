import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { ReleaseGatePanel, ReleaseSummaryStrip, normalizedReleaseLabel, releaseReadinessTone } from "@/components/ReleaseGatePanel";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import type { PillTone } from "@/components/StatusPill";
import { apiGet, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { MotherReleaseGatesResponse, MotherHealthReportResponse, MotherAlertsResponse, MotherDiagnosticsSummaryResponse } from "@/lib/types";

export default function ReleasePage() {
  const { hasPermission } = useAuth();

  const { data: gatesResult } = useQuery({
    queryKey: ["mother", "release-gates"],
    queryFn: () => apiGet<MotherReleaseGatesResponse>("mother/release-gates"),
  });

  const { data: healthReportResult } = useQuery({
    queryKey: ["mother", "health-report"],
    queryFn: () => apiGet<MotherHealthReportResponse>("mother/health-report"),
  });

  const { data: alertsResult } = useQuery({
    queryKey: ["mother", "alerts", { status: "active", limit: 20 }],
    queryFn: () => apiGet<MotherAlertsResponse>("mother/alerts", { status: "active", limit: 20 }),
  });

  const { data: summaryResult } = useQuery({
    queryKey: ["mother", "diagnostics", "summary"],
    queryFn: () => apiGet<MotherDiagnosticsSummaryResponse>("mother/diagnostics/summary"),
  });

  if (!hasPermission("release.view")) {
    return <div className="notice danger">Access denied. You do not have permission to view release readiness.</div>;
  }

  const gatesData = read(gatesResult!);
  const gates = gatesData?.gates || [];
  const summary = gatesData?.summary;
  const alerts = read(alertsResult!)?.alerts || [];
  const report = read(healthReportResult!);
  const diagSummary = read(summaryResult!)?.summary;

  const label = normalizedReleaseLabel(summary);
  const tone = releaseReadinessTone(summary);
  const total = summary?.total ?? gates.length;
  const evaluated = (summary?.pass || 0) + (summary?.warn || 0) + (summary?.fail || 0) + (summary?.skipped || 0) + (summary?.unknown || 0);
  
  const heroDescription =
    label === "Ready"
      ? "All release gates evaluated by Mother are passing. No blockers are currently reported."
      : label === "Conditional"
        ? "No hard blockers, but warnings or unresolved checks require operator review before proceeding."
        : label === "Blocked"
          ? "One or more release gates are failing. Rollout must not proceed until blockers are resolved."
          : "Mother has not returned enough evidence to determine readiness yet.";

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

  const telemetryFresh = diagSummary?.telemetry_fresh ?? 0;
  const telemetryTotal = diagSummary?.total_agents ?? 0;
  const telemetryMissing = diagSummary?.telemetry_missing ?? 0;
  const telemetryPostureTone: PillTone = telemetryMissing > 0 ? "warning" : (telemetryFresh > 0 ? "success" : "neutral");
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

      <div className="section-block">
        <SectionCard title="Release gate posture" description="Aggregated gate evidence from Mother. All signals are read-only — no gate can be overridden from this dashboard.">
          <ReleaseSummaryStrip summary={gateSummaryFromReport as any} />
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
        <SectionCard title="Release gates" description="Detailed list of release gates currently evaluated by Mother.">
          <ReleaseGatePanel gates={gates} />
        </SectionCard>
      </div>

      <RawJsonDrawer data={{ gatesResult, healthReportResult, alertsResult, summaryResult }} title="Raw readiness payloads" />
    </>
  );
}
