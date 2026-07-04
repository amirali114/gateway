import "server-only";
import { getMotherAgents, getMotherAlertSummary, getMotherHealth, getMotherReady, getMotherReleaseGateSummary, getMotherStorageStatus, read } from "../api";
import type { DashboardOverview } from "./contracts";
import { countAgents, emptyAlertSummary, emptyReleaseSummary } from "./mappers";

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [healthResult, readyResult, agentsResult, alertsResult, releaseResult, storageResult] = await Promise.all([
    getMotherHealth(), getMotherReady(), getMotherAgents(), getMotherAlertSummary(), getMotherReleaseGateSummary(), getMotherStorageStatus()
  ]);
  const agents = read(agentsResult)?.agents || [];
  const counts = countAgents(agents);
  return {
    health: { ok: Boolean(read(healthResult)?.ok), service: read(healthResult)?.service || "unixsee-mother", mode: read(healthResult)?.mode || "staging" },
    ready: { ok: Boolean(read(readyResult)?.ok), storage: read(readyResult)?.storage || "unknown", engine: read(readyResult)?.storage_engine || "unknown" },
    agents: { ...counts, items: agents },
    alerts: read(alertsResult) || emptyAlertSummary(),
    release: read(releaseResult) || emptyReleaseSummary(),
    storage: read(storageResult)
  };
}
