import "server-only";
import type {
  ApiResult,
  HealthResponse,
  MotherAgentResponse,
  MotherAgentsResponse,
  MotherConfigHistoryResponse, MotherConfigDiffResponse, MotherConfigVersionsResponse, MotherConfigValidationResponse,
  MotherConfigResponse,
  MotherControlPlaneResponse,
  MotherDiagnosticsResponse,
  MotherDiagnosticsSummaryResponse,
  MotherEventsResponse,
  MotherPoliciesResponse,
  MotherPolicyAssignmentResponse,
  MotherPolicyResponse,
  MotherTelemetryResponse,
  MotherStorageStatusResponse,
  MotherHealthReportResponse,
  MotherAlertsResponse,
  MotherAlertResponse,
  MotherAlertSummaryResponse,
  MotherReleaseGatesResponse,
  MotherReleaseGateSummary,
  ReadyResponse,
  UnknownRecord
} from "./types";

const DEFAULT_TIMEOUT_MS = 2200;

const rawMotherBaseUrl =
  process.env.UNIXSEE_MOTHER_BASE_URL ||
  process.env.NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL ||
  "http://127.0.0.1:8732";


export const motherBaseUrl = normalizeBaseUrl(rawMotherBaseUrl);

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request timed out";
    return err.message.replace(/\s+at\s+.*/gs, "").slice(0, 220) || "Request failed";
  }
  return "Request failed";
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%2F/gi, "");
}

export async function safeFetchJson<T>(baseUrl: string, path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    const text = await res.text();
    let data: unknown = null;
    if (text.trim() !== "") {
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    }

    if (!res.ok) {
      const error = typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error || `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err) };
  } finally {
    clearTimeout(timer);
  }
}

export async function postMotherJson<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS, actorHeaders: Record<string, string> = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${motherBaseUrl}${path}`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN ? { Authorization: `Bearer ${process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN}` } : {}),
        ...actorHeaders
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data: unknown = null;
    if (text.trim() !== "") {
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    }
    if (!res.ok) {
      const error = typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error || `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return { ok: false, error: safeErrorMessage(err) };
  } finally {
    clearTimeout(timer);
  }
}

export function read<T>(result: ApiResult<T>): T | undefined {
  return result.ok ? result.data : undefined;
}

export function valueOrDash(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  return String(value);
}

export function ltr(value: unknown): string {
  return valueOrDash(value);
}

export function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

export function getNestedRecord(record: UnknownRecord | undefined, key: string): UnknownRecord {
  if (!record) return {};
  return asRecord(record[key]);
}

export function getMotherHealth() {
  return safeFetchJson<HealthResponse>(motherBaseUrl, "/healthz");
}

export function getMotherReady() {
  return safeFetchJson<ReadyResponse>(motherBaseUrl, "/readyz");
}

export function getMotherPolicies() {
  return safeFetchJson<MotherPoliciesResponse>(motherBaseUrl, "/v1/policies");
}

export function getMotherPolicy(policyId: string) {
  return safeFetchJson<MotherPolicyResponse>(motherBaseUrl, `/v1/policies/${encodePathPart(policyId)}`);
}

export function getMotherDebugDefaultPolicy() {
  return safeFetchJson<UnknownRecord>(motherBaseUrl, "/v1/debug/policies/default");
}

export function getMotherAgents() {
  return safeFetchJson<MotherAgentsResponse>(motherBaseUrl, "/v1/agents");
}

export function getMotherAgent(agentId: string) {
  return safeFetchJson<MotherAgentResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}`);
}

export function getMotherAgentTelemetry(agentId: string) {
  return safeFetchJson<MotherTelemetryResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/telemetry`);
}

export function getMotherAgentDiagnostics(agentId: string) {
  return safeFetchJson<MotherDiagnosticsResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/diagnostics`);
}

export function getMotherAgentEvents(agentId: string) {
  return safeFetchJson<MotherEventsResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/events`);
}

export function getMotherDiagnosticsSummary() {
  return safeFetchJson<MotherDiagnosticsSummaryResponse>(motherBaseUrl, "/v1/diagnostics/summary");
}

export function getMotherStorageStatus() {
  return safeFetchJson<MotherStorageStatusResponse>(motherBaseUrl, "/v1/storage/status");
}

export function getMotherHealthReport() {
  return safeFetchJson<MotherHealthReportResponse>(motherBaseUrl, "/v1/health/report");
}

export function getMotherReleaseGates() {
  return safeFetchJson<MotherReleaseGatesResponse>(motherBaseUrl, "/v1/release-gates");
}

export function getMotherReleaseGateSummary() {
  return safeFetchJson<MotherReleaseGateSummary>(motherBaseUrl, "/v1/release-gates/summary");
}

export function getMotherAlerts(params: { status?: string; agent_id?: string; scope?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.agent_id) q.set("agent_id", params.agent_id);
  if (params.scope) q.set("scope", params.scope);
  if (params.limit) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return safeFetchJson<MotherAlertsResponse>(motherBaseUrl, `/v1/alerts${suffix}`);
}

export function getMotherAlert(alertId: string) {
  return safeFetchJson<MotherAlertResponse>(motherBaseUrl, `/v1/alerts/${encodePathPart(alertId)}`);
}

export function getMotherAlertSummary() {
  return safeFetchJson<MotherAlertSummaryResponse>(motherBaseUrl, "/v1/alerts/summary");
}

export function evaluateMotherAlerts() {
  return postMotherJson<{ ok?: boolean; summary?: MotherAlertSummaryResponse }>("/v1/alerts/evaluate", {});
}

export function resolveMotherAlert(alertId: string, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherAlertResponse>(`/v1/alerts/${encodePathPart(alertId)}/resolve`, {}, undefined, actorHeaders);
}

export function muteMotherAlert(alertId: string, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherAlertResponse>(`/v1/alerts/${encodePathPart(alertId)}/mute`, {}, undefined, actorHeaders);
}

export function unmuteMotherAlert(alertId: string, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherAlertResponse>(`/v1/alerts/${encodePathPart(alertId)}/unmute`, {}, undefined, actorHeaders);
}

export function getMotherPolicyAssignment(agentId: string) {
  return safeFetchJson<MotherPolicyAssignmentResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/policy-assignment`);
}

export function getMotherControlPlane(agentId: string) {
  return safeFetchJson<MotherControlPlaneResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/control-plane`);
}

export function getMotherAgentConfig(agentId: string) {
  return safeFetchJson<MotherConfigResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config`);
}

export function getMotherAgentConfigHistory(agentId: string) {
  return safeFetchJson<MotherConfigHistoryResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/history`);
}

export function getMotherAgentConfigDraft(agentId: string) {
  return safeFetchJson<MotherConfigResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/draft`);
}

export function getMotherAgentConfigActive(agentId: string) {
  return safeFetchJson<MotherConfigResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/active`);
}

export function getMotherAgentConfigDiff(agentId: string) {
  return safeFetchJson<MotherConfigDiffResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/diff`);
}

export function getMotherAgentConfigVersions(agentId: string) {
  return safeFetchJson<MotherConfigVersionsResponse>(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/versions`);
}

export function validateMotherAgentConfig(agentId: string, config: unknown, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherConfigValidationResponse>(`/v1/agents/${encodePathPart(agentId)}/config/validate`, { config }, undefined, actorHeaders);
}

export function publishMotherAgentConfig(agentId: string, note: string, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherConfigResponse>(`/v1/agents/${encodePathPart(agentId)}/config/publish`, { note }, undefined, actorHeaders);
}

export function rollbackMotherAgentConfig(agentId: string, targetVersion: number, note: string, actorHeaders: Record<string, string> = {}) {
  return postMotherJson<MotherConfigResponse>(`/v1/agents/${encodePathPart(agentId)}/config/rollback`, { target_version: targetVersion, note }, undefined, actorHeaders);
}

export function controlPlaneConfigFromForm(formData: FormData) {
  return {
    gateway: {
      enabled: formData.get("gateway_enabled") === "on",
      mode: "shadow",
      default_action: String(formData.get("default_action") || "allow")
    },
    campaign: { enabled: formData.get("campaign_enabled") === "on" },
    queue: { enabled: formData.get("queue_enabled") === "on" },
    bot: { enabled: formData.get("bot_enabled") === "on" },
    storage: { fail_mode: String(formData.get("storage_fail_mode") || "open") },
    security: { require_signature: formData.get("require_signature") === "on" }
  };
}
