import type { MotherAgentRecord, MotherAlertSummaryResponse, MotherReleaseGateSummary } from "../types";

export function countAgents(agents: MotherAgentRecord[]) {
  const online = agents.filter((agent) => agent.status === "online").length;
  const stale = agents.filter((agent) => agent.status === "stale").length;
  return { total: agents.length, online, stale, unknown: Math.max(0, agents.length - online - stale), freshTelemetry: agents.filter((agent) => agent.telemetry_status === "fresh").length };
}

export function releaseLabel(summary?: MotherReleaseGateSummary): string {
  if (!summary) return "Unknown";
  if ((summary.fail || 0) > 0 || (summary.blockers || []).length > 0) return "Blocked";
  if ((summary.warn || 0) > 0 || (summary.unknown || 0) > 0 || (summary.skipped || 0) > 0) return "Conditional";
  return summary.ready ? "Ready" : "Needs review";
}

export function emptyAlertSummary(): MotherAlertSummaryResponse { return { ok: true, active_total: 0, critical: 0, warn: 0, info: 0, muted: 0, resolved_24h: 0, latest: [] }; }
export function emptyReleaseSummary(): MotherReleaseGateSummary { return { ok: true, ready: false, label: "Unknown", total: 0, pass: 0, warn: 0, fail: 0, skipped: 0, unknown: 0, blockers: [], warnings: [] }; }
