import type { MotherReleaseGate, MotherReleaseGateSummary } from "../lib/types";
import { valueOrDash } from "../lib/api";
import { StatusPill } from "./StatusPill";
import { EmptyState } from "./EmptyState";

export function normalizedReleaseLabel(summary?: MotherReleaseGateSummary): string {
  if (!summary) return "Unknown";
  if ((summary.fail || 0) > 0 || (summary.blockers || []).length > 0) return "Blocked";
  if ((summary.warn || 0) > 0 || (summary.unknown || 0) > 0 || (summary.skipped || 0) > 0) return "Conditional";
  return summary.ready ? "Ready" : "Needs review";
}

export function releaseReadinessTone(summary?: MotherReleaseGateSummary): "success" | "warning" | "danger" | "neutral" {
  const label = normalizedReleaseLabel(summary);
  if (label === "Blocked") return "danger";
  if (label === "Conditional") return "warning";
  if (label === "Ready") return "success";
  return "neutral";
}

export function ReleaseSummaryStrip({ summary }: { summary?: MotherReleaseGateSummary }) {
  return (
    <div className="grid kpis">
      <div className="kpi-card success"><div className="kpi-head"><span>Pass</span><span className="kpi-icon">✓</span></div><div className="kpi-value">{summary?.pass ?? 0}</div></div>
      <div className="kpi-card warning"><div className="kpi-head"><span>Warn</span><span className="kpi-icon">!</span></div><div className="kpi-value">{summary?.warn ?? 0}</div></div>
      <div className="kpi-card danger"><div className="kpi-head"><span>Fail</span><span className="kpi-icon">×</span></div><div className="kpi-value">{summary?.fail ?? 0}</div></div>
      <div className="kpi-card blue"><div className="kpi-head"><span>Status</span><span className="kpi-icon">◇</span></div><div className="kpi-value"><StatusPill value={normalizedReleaseLabel(summary)} /></div></div>
    </div>
  );
}

function gateTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "fail") return "danger";
  if (status === "warn" || status === "unknown" || status === "skipped") return "warning";
  if (status === "pass") return "success";
  return "neutral";
}

function GateCard({ gate }: { gate: MotherReleaseGate }) {
  const status = gate.status || "unknown";
  const tone = gateTone(status);
  return (
    <article className={`release-card tone-${tone}`} key={gate.id || `${gate.category}-${gate.title}`}>
      <div className="release-card-head">
        <div><div className="release-title">{valueOrDash(gate.title)}</div><div className="agent-id">{valueOrDash(gate.category)} · {valueOrDash(gate.id)}</div></div>
        <StatusPill value={status} />
      </div>
      <div className="release-message">{valueOrDash(gate.message)}</div>
      {gate.remediation_hint ? <div className="remediation-hint"><span>↳</span><span>{gate.remediation_hint}</span></div> : null}
    </article>
  );
}

export function ReleaseGatePanel({ gates, grouped }: { gates: MotherReleaseGate[]; grouped?: boolean }) {
  if (!gates.length) return <EmptyState tone="info" icon="◎" title="No release gates yet" description="Mother has not returned release-gate evidence for this environment." />;
  if (!grouped) {
    return <div className="release-list">{gates.map((gate) => <GateCard gate={gate} key={gate.id || `${gate.category}-${gate.title}`} />)}</div>;
  }
  const order = ["fail", "warn", "unknown", "skipped", "pass"] as const;
  const labels: Record<string, string> = { fail: "Failing", warn: "Warnings", unknown: "Unknown", skipped: "Skipped", pass: "Passing" };
  const groups = order
    .map((status) => ({ status, items: gates.filter((g) => (g.status || "unknown") === status) }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="release-list">
      {groups.map((group) => (
        <div key={group.status}>
          <div className="gate-group-head">
            <StatusPill value={group.status} />
            <span className="gate-group-title">{labels[group.status]}</span>
            <span className="gate-group-count">{group.items.length}</span>
          </div>
          {group.items.map((gate) => <GateCard gate={gate} key={gate.id || `${gate.category}-${gate.title}`} />)}
        </div>
      ))}
    </div>
  );
}
