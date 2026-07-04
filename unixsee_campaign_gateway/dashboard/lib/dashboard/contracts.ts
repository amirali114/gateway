import type { MotherAgentRecord, MotherAlertSummaryResponse, MotherReleaseGateSummary, MotherStorageStatusResponse } from "../types";

export type DashboardOverview = {
  health: { ok: boolean; service: string; mode: string };
  ready: { ok: boolean; storage: string; engine: string };
  agents: { total: number; online: number; stale: number; unknown: number; freshTelemetry: number; items: MotherAgentRecord[] };
  alerts: MotherAlertSummaryResponse;
  release: MotherReleaseGateSummary;
  storage?: MotherStorageStatusResponse;
};
