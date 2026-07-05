module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/artifacts/gateway-dashboard/lib/api.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "asRecord",
    ()=>asRecord,
    "controlPlaneConfigFromForm",
    ()=>controlPlaneConfigFromForm,
    "evaluateMotherAlerts",
    ()=>evaluateMotherAlerts,
    "getMotherAgent",
    ()=>getMotherAgent,
    "getMotherAgentConfig",
    ()=>getMotherAgentConfig,
    "getMotherAgentConfigActive",
    ()=>getMotherAgentConfigActive,
    "getMotherAgentConfigDiff",
    ()=>getMotherAgentConfigDiff,
    "getMotherAgentConfigDraft",
    ()=>getMotherAgentConfigDraft,
    "getMotherAgentConfigHistory",
    ()=>getMotherAgentConfigHistory,
    "getMotherAgentConfigVersions",
    ()=>getMotherAgentConfigVersions,
    "getMotherAgentDiagnostics",
    ()=>getMotherAgentDiagnostics,
    "getMotherAgentEvents",
    ()=>getMotherAgentEvents,
    "getMotherAgentTelemetry",
    ()=>getMotherAgentTelemetry,
    "getMotherAgents",
    ()=>getMotherAgents,
    "getMotherAlert",
    ()=>getMotherAlert,
    "getMotherAlertSummary",
    ()=>getMotherAlertSummary,
    "getMotherAlerts",
    ()=>getMotherAlerts,
    "getMotherControlPlane",
    ()=>getMotherControlPlane,
    "getMotherDebugDefaultPolicy",
    ()=>getMotherDebugDefaultPolicy,
    "getMotherDiagnosticsSummary",
    ()=>getMotherDiagnosticsSummary,
    "getMotherHealth",
    ()=>getMotherHealth,
    "getMotherHealthReport",
    ()=>getMotherHealthReport,
    "getMotherPolicies",
    ()=>getMotherPolicies,
    "getMotherPolicy",
    ()=>getMotherPolicy,
    "getMotherPolicyAssignment",
    ()=>getMotherPolicyAssignment,
    "getMotherReady",
    ()=>getMotherReady,
    "getMotherReleaseGateSummary",
    ()=>getMotherReleaseGateSummary,
    "getMotherReleaseGates",
    ()=>getMotherReleaseGates,
    "getMotherStorageStatus",
    ()=>getMotherStorageStatus,
    "getNestedRecord",
    ()=>getNestedRecord,
    "ltr",
    ()=>ltr,
    "motherBaseUrl",
    ()=>motherBaseUrl,
    "muteMotherAlert",
    ()=>muteMotherAlert,
    "postMotherJson",
    ()=>postMotherJson,
    "publishMotherAgentConfig",
    ()=>publishMotherAgentConfig,
    "read",
    ()=>read,
    "resolveMotherAlert",
    ()=>resolveMotherAlert,
    "rollbackMotherAgentConfig",
    ()=>rollbackMotherAgentConfig,
    "safeFetchJson",
    ()=>safeFetchJson,
    "unmuteMotherAlert",
    ()=>unmuteMotherAlert,
    "validateMotherAgentConfig",
    ()=>validateMotherAgentConfig,
    "valueOrDash",
    ()=>valueOrDash
]);
;
const DEFAULT_TIMEOUT_MS = 2200;
const rawMotherBaseUrl = process.env.UNIXSEE_MOTHER_BASE_URL || "http://127.0.0.1:8732";
const motherBaseUrl = normalizeBaseUrl(rawMotherBaseUrl);
function normalizeBaseUrl(value) {
    return value.trim().replace(/\/+$/, "");
}
function safeErrorMessage(err) {
    if (err instanceof Error) {
        if (err.name === "AbortError") return "Request timed out";
        return err.message.replace(/\s+at\s+.*/gs, "").slice(0, 220) || "Request failed";
    }
    return "Request failed";
}
function encodePathPart(value) {
    return encodeURIComponent(value.trim()).replace(/%2F/gi, "");
}
async function safeFetchJson(baseUrl, path, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
            headers: {
                Accept: "application/json"
            }
        });
        const text = await res.text();
        let data = null;
        if (text.trim() !== "") {
            try {
                data = JSON.parse(text);
            } catch  {
                data = {
                    raw: text.slice(0, 500)
                };
            }
        }
        if (!res.ok) {
            const error = typeof data === "object" && data !== null && "error" in data ? String(data.error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
            return {
                ok: false,
                status: res.status,
                error
            };
        }
        return {
            ok: true,
            status: res.status,
            data: data
        };
    } catch (err) {
        return {
            ok: false,
            error: safeErrorMessage(err)
        };
    } finally{
        clearTimeout(timer);
    }
}
async function postMotherJson(path, body, timeoutMs = DEFAULT_TIMEOUT_MS, actorHeaders = {}) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${motherBaseUrl}${path}`, {
            method: "POST",
            cache: "no-store",
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN ? {
                    Authorization: `Bearer ${process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN}`
                } : {},
                ...actorHeaders
            },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        let data = null;
        if (text.trim() !== "") {
            try {
                data = JSON.parse(text);
            } catch  {
                data = {
                    raw: text.slice(0, 500)
                };
            }
        }
        if (!res.ok) {
            const error = typeof data === "object" && data !== null && "error" in data ? String(data.error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
            return {
                ok: false,
                status: res.status,
                error
            };
        }
        return {
            ok: true,
            status: res.status,
            data: data
        };
    } catch (err) {
        return {
            ok: false,
            error: safeErrorMessage(err)
        };
    } finally{
        clearTimeout(timer);
    }
}
function read(result) {
    return result && result.ok ? result.data : undefined;
}
function valueOrDash(value) {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "enabled" : "disabled";
    return String(value);
}
function ltr(value) {
    return valueOrDash(value);
}
function asRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function getNestedRecord(record, key) {
    if (!record) return {};
    return asRecord(record[key]);
}
function getMotherHealth() {
    return safeFetchJson(motherBaseUrl, "/healthz");
}
function getMotherReady() {
    return safeFetchJson(motherBaseUrl, "/readyz");
}
function getMotherPolicies() {
    return safeFetchJson(motherBaseUrl, "/v1/policies");
}
function getMotherPolicy(policyId) {
    return safeFetchJson(motherBaseUrl, `/v1/policies/${encodePathPart(policyId)}`);
}
function getMotherDebugDefaultPolicy() {
    return safeFetchJson(motherBaseUrl, "/v1/debug/policies/default");
}
function getMotherAgents() {
    return safeFetchJson(motherBaseUrl, "/v1/agents");
}
function getMotherAgent(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}`);
}
function getMotherAgentTelemetry(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/telemetry`);
}
function getMotherAgentDiagnostics(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/diagnostics`);
}
function getMotherAgentEvents(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/events`);
}
function getMotherDiagnosticsSummary() {
    return safeFetchJson(motherBaseUrl, "/v1/diagnostics/summary");
}
function getMotherStorageStatus() {
    return safeFetchJson(motherBaseUrl, "/v1/storage/status");
}
function getMotherHealthReport() {
    return safeFetchJson(motherBaseUrl, "/v1/health/report");
}
function getMotherReleaseGates() {
    return safeFetchJson(motherBaseUrl, "/v1/release-gates");
}
function getMotherReleaseGateSummary() {
    return safeFetchJson(motherBaseUrl, "/v1/release-gates/summary");
}
function getMotherAlerts(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.agent_id) q.set("agent_id", params.agent_id);
    if (params.scope) q.set("scope", params.scope);
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return safeFetchJson(motherBaseUrl, `/v1/alerts${suffix}`);
}
function getMotherAlert(alertId) {
    return safeFetchJson(motherBaseUrl, `/v1/alerts/${encodePathPart(alertId)}`);
}
function getMotherAlertSummary() {
    return safeFetchJson(motherBaseUrl, "/v1/alerts/summary");
}
function evaluateMotherAlerts() {
    return postMotherJson("/v1/alerts/evaluate", {});
}
function resolveMotherAlert(alertId, actorHeaders = {}) {
    return postMotherJson(`/v1/alerts/${encodePathPart(alertId)}/resolve`, {}, undefined, actorHeaders);
}
function muteMotherAlert(alertId, actorHeaders = {}) {
    return postMotherJson(`/v1/alerts/${encodePathPart(alertId)}/mute`, {}, undefined, actorHeaders);
}
function unmuteMotherAlert(alertId, actorHeaders = {}) {
    return postMotherJson(`/v1/alerts/${encodePathPart(alertId)}/unmute`, {}, undefined, actorHeaders);
}
function getMotherPolicyAssignment(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/policy-assignment`);
}
function getMotherControlPlane(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/control-plane`);
}
function getMotherAgentConfig(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config`);
}
function getMotherAgentConfigHistory(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/history`);
}
function getMotherAgentConfigDraft(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/draft`);
}
function getMotherAgentConfigActive(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/active`);
}
function getMotherAgentConfigDiff(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/diff`);
}
function getMotherAgentConfigVersions(agentId) {
    return safeFetchJson(motherBaseUrl, `/v1/agents/${encodePathPart(agentId)}/config/versions`);
}
function validateMotherAgentConfig(agentId, config, actorHeaders = {}) {
    return postMotherJson(`/v1/agents/${encodePathPart(agentId)}/config/validate`, {
        config
    }, undefined, actorHeaders);
}
function publishMotherAgentConfig(agentId, note, actorHeaders = {}) {
    return postMotherJson(`/v1/agents/${encodePathPart(agentId)}/config/publish`, {
        note
    }, undefined, actorHeaders);
}
function rollbackMotherAgentConfig(agentId, targetVersion, note, actorHeaders = {}) {
    return postMotherJson(`/v1/agents/${encodePathPart(agentId)}/config/rollback`, {
        target_version: targetVersion,
        note
    }, undefined, actorHeaders);
}
function controlPlaneConfigFromForm(formData) {
    return {
        gateway: {
            enabled: formData.get("gateway_enabled") === "on",
            mode: "shadow",
            default_action: String(formData.get("default_action") || "allow")
        },
        campaign: {
            enabled: formData.get("campaign_enabled") === "on"
        },
        queue: {
            enabled: formData.get("queue_enabled") === "on"
        },
        bot: {
            enabled: formData.get("bot_enabled") === "on"
        },
        storage: {
            fail_mode: String(formData.get("storage_fail_mode") || "open")
        },
        security: {
            require_signature: formData.get("require_signature") === "on"
        }
    };
}
}),
"[project]/artifacts/gateway-dashboard/components/AgentCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgentCard",
    ()=>AgentCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/api.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/StatusPill.tsx [app-rsc] (ecmascript)");
;
;
;
function formatRate(value) {
    const n = typeof value === "number" ? value : Number(value || 0);
    return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—";
}
function AgentCard({ agent, href }) {
    const id = agent.agent_id || "unknown-agent";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "agent-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "agent-top",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "agent-name",
                                children: href ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: href,
                                    children: id
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                    lineNumber: 15,
                                    columnNumber: 50
                                }, this) : id
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 15,
                                columnNumber: 14
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "agent-id",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_source_ip)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 15,
                                columnNumber: 85
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 15,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                        value: agent.status || "unknown"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 16,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "agent-metrics",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "agent-metric",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Match rate"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 19,
                                columnNumber: 39
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: formatRate(agent.last_match_rate)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 19,
                                columnNumber: 62
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 19,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "agent-metric",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Received"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 20,
                                columnNumber: 39
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_received)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 20,
                                columnNumber: 60
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "agent-metric",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Mismatched"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 21,
                                columnNumber: 39
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_mismatched)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                                lineNumber: 21,
                                columnNumber: 62
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "agent-tags",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "tag",
                        children: [
                            "cfg:",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.active_config_version)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "tag",
                        children: [
                            "policy:",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_policy_version)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                        value: agent.telemetry_status || "missing"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "agent-foot",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Last seen"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mono",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_seen_at)
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/AgentCard.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/DataTable.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataTable",
    ()=>DataTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function DataTable({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "table-wrap",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            className: "data-table",
            children: children
        }, void 0, false, {
            fileName: "[project]/artifacts/gateway-dashboard/components/DataTable.tsx",
            lineNumber: 2,
            columnNumber: 103
        }, this)
    }, void 0, false, {
        fileName: "[project]/artifacts/gateway-dashboard/components/DataTable.tsx",
        lineNumber: 2,
        columnNumber: 75
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/EmptyState.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmptyState",
    ()=>EmptyState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function EmptyState({ title, description, icon, tone = "neutral" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: tone === "info" ? "empty-state empty-state-info" : "empty-state",
        children: [
            icon ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "empty-state-icon",
                children: icon
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/EmptyState.tsx",
                lineNumber: 6,
                columnNumber: 15
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/EmptyState.tsx",
                        lineNumber: 7,
                        columnNumber: 12
                    }, this),
                    description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/EmptyState.tsx",
                        lineNumber: 7,
                        columnNumber: 51
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/EmptyState.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/EmptyState.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/ErrorState.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ErrorState",
    ()=>ErrorState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function ErrorState({ title = "Unable to load data", error }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "error-state",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                children: title
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/ErrorState.tsx",
                lineNumber: 2,
                columnNumber: 39
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: error || "The service is unavailable or returned an invalid response."
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/ErrorState.tsx",
                lineNumber: 2,
                columnNumber: 63
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/ErrorState.tsx",
        lineNumber: 2,
        columnNumber: 10
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/KpiCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "KpiCard",
    ()=>KpiCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function KpiCard({ title, value, hint, icon = "•", tone = "neutral" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: `kpi-card ${tone}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "kpi-head",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
                        lineNumber: 7,
                        columnNumber: 33
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "kpi-icon",
                        children: icon
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
                        lineNumber: 7,
                        columnNumber: 53
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "kpi-value",
                children: value
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, this),
            hint ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "kpi-hint",
                children: hint
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
                lineNumber: 9,
                columnNumber: 15
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/KpiCard.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/PageHeader.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PageHeader",
    ()=>PageHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function PageHeader({ eyebrow, title, description, actions, meta }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "page-header",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    eyebrow ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "page-eyebrow",
                        children: eyebrow
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                        lineNumber: 7,
                        columnNumber: 20
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "page-title-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "page-title",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                                lineNumber: 9,
                                columnNumber: 11
                            }, this),
                            meta ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "page-meta",
                                children: meta
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                                lineNumber: 10,
                                columnNumber: 19
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                        lineNumber: 8,
                        columnNumber: 9
                    }, this),
                    description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "page-description",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                        lineNumber: 12,
                        columnNumber: 24
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                lineNumber: 6,
                columnNumber: 7
            }, this),
            actions ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "page-actions",
                children: actions
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
                lineNumber: 14,
                columnNumber: 18
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/PageHeader.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RawJsonDrawer",
    ()=>RawJsonDrawer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function RawJsonDrawer({ data, title = "Raw response" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
        className: "raw-json",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("summary", {
                children: title
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                className: "json-pre",
                children: JSON.stringify(data ?? null, null, 2)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx",
                lineNumber: 5,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/components/SectionCard.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SectionCard",
    ()=>SectionCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function SectionCard({ title, description, action, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "section-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "section-title",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
                                lineNumber: 7,
                                columnNumber: 14
                            }, this),
                            description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "section-description",
                                children: description
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
                                lineNumber: 7,
                                columnNumber: 71
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
                        lineNumber: 7,
                        columnNumber: 9
                    }, this),
                    action ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "section-action",
                        children: action
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
                        lineNumber: 8,
                        columnNumber: 19
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
                lineNumber: 6,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/artifacts/gateway-dashboard/components/SectionCard.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
}),
"[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AgentsPage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/AgentCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$DataTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/DataTable.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/EmptyState.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$ErrorState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/ErrorState.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/KpiCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$PageHeader$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/PageHeader.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/SectionCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/StatusPill.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/api.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/auth.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
const dynamic = "force-dynamic";
function pct(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}%` : "—";
}
async function AgentsPage() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requirePermission"])("agents.view");
    const [agentsResult, summaryResult, alertsResult] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgents"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherDiagnosticsSummary"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAlertSummary"])()
    ]);
    const agents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(agentsResult)?.agents || [];
    const summary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(summaryResult)?.summary;
    const online = summary?.online_agents ?? agents.filter((a)=>a.status === "online").length;
    const stale = summary?.stale_agents ?? agents.filter((a)=>a.status === "stale").length;
    const unknown = summary?.unknown_agents ?? Math.max(0, agents.length - online - stale);
    const total = agentsResult.ok ? agents.length : 0;
    const registryTone = !agentsResult.ok ? "danger" : total === 0 ? "blue" : stale > 0 || unknown > 0 ? "warning" : "success";
    const registryLabel = !agentsResult.ok ? "Unavailable" : total === 0 ? "Empty registry" : stale > 0 || unknown > 0 ? "Needs review" : "All healthy";
    const alertTone = ((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult)?.critical || 0) > 0 ? "danger" : ((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult)?.warn || 0) > 0 ? "warning" : "neutral";
    const telemetryFresh = summary?.telemetry_fresh ?? agents.filter((a)=>a.telemetry_status === "fresh").length;
    const telemetryStale = summary?.telemetry_stale ?? agents.filter((a)=>a.telemetry_status === "stale").length;
    const telemetryMissing = summary?.telemetry_missing ?? agents.filter((a)=>!a.telemetry_status || a.telemetry_status === "missing").length;
    const telemetryTotal = total || telemetryFresh + telemetryStale + telemetryMissing;
    const telemetryPostureTone = telemetryMissing > 0 ? "warning" : telemetryStale > 0 ? "warning" : telemetryFresh > 0 ? "success" : "neutral";
    const syncOk = agents.filter((a)=>a.config_sync_status === "ok" || a.config_sync_status === "synced").length;
    const syncPending = agents.filter((a)=>a.config_sync_status === "pending" || a.config_sync_status === "unknown").length;
    const syncStale = agents.filter((a)=>a.config_sync_status === "stale" || a.config_sync_status === "error").length;
    const syncPostureTone = syncStale > 0 ? "danger" : syncPending > 0 ? "warning" : syncOk > 0 ? "success" : "neutral";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$PageHeader$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PageHeader"], {
                eyebrow: "Registry",
                title: "Agents",
                description: "Mother registry and telemetry aggregate. The dashboard never fetches Agents directly from the browser.",
                meta: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                    tone: registryTone,
                    children: registryLabel
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 46,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "hero-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-main",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `hero-badge ${registryTone === "blue" ? "" : registryTone}`,
                                children: "◎"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 51,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-label",
                                        children: "Registry status"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 53,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-value",
                                        children: [
                                            online,
                                            "/",
                                            total,
                                            " online"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 54,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-sub",
                                        children: "Aggregated from Mother's agent registry. Agents remain shadow-only — no remote commands are issued from this dashboard."
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 55,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 52,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-stats",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Total"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 59,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: total
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 59,
                                        columnNumber: 56
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Stale"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 60,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: stale
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 60,
                                        columnNumber: 56
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 60,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Unknown"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 61,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: unknown
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 61,
                                        columnNumber: 58
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Active alerts"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 62,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult)?.active_total ?? 0
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 62,
                                        columnNumber: 64
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid kpis",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Fresh telemetry",
                        value: summary?.telemetry_fresh ?? 0,
                        hint: "agents reporting within freshness window",
                        icon: "⌁",
                        tone: "success"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 67,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Missing telemetry",
                        value: summary?.telemetry_missing ?? 0,
                        hint: "no recent telemetry payload",
                        icon: "!",
                        tone: (summary?.telemetry_missing ?? 0) > 0 ? "warning" : "success"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Avg match rate",
                        value: pct(summary?.average_match_rate),
                        hint: "policy match rate across fleet",
                        icon: "◈",
                        tone: "blue"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 69,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Active alerts",
                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult)?.active_total ?? 0,
                        hint: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult)?.critical || 0} critical`,
                        icon: "▲",
                        tone: alertTone
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 70,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            agentsResult.ok && total > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                    title: "Telemetry freshness",
                    description: "Distribution of telemetry state across the registered fleet. Mother determines freshness based on each agent's stale_after_seconds window.",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "pulse-grid",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pulse-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-head",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Fresh"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 83,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    tone: "success",
                                                    children: telemetryFresh
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 84,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 82,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-value",
                                            children: telemetryTotal > 0 ? pct(telemetryFresh / telemetryTotal * 100) : "—"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 86,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-note",
                                            children: "Reported within freshness window"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 87,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 81,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pulse-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-head",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Stale"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 91,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    tone: telemetryStale > 0 ? "warning" : "success",
                                                    children: telemetryStale
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 92,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 90,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-value",
                                            children: telemetryTotal > 0 ? pct(telemetryStale / telemetryTotal * 100) : "—"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 94,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-note",
                                            children: "Last push exceeded freshness window"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 95,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 89,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pulse-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-head",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Missing"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 99,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    tone: telemetryMissing > 0 ? "warning" : "neutral",
                                                    children: telemetryMissing
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 100,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 98,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-value",
                                            children: telemetryTotal > 0 ? pct(telemetryMissing / telemetryTotal * 100) : "—"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 102,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-note",
                                            children: "No telemetry payload received yet"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 103,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 97,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pulse-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-head",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Posture"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 107,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    tone: telemetryPostureTone,
                                                    children: telemetryPostureTone === "success" ? "Nominal" : "Needs review"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 106,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-value",
                                            children: [
                                                telemetryFresh,
                                                "/",
                                                telemetryTotal
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 110,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "pulse-item-note",
                                            children: "Fresh agents out of total registered"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 111,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 105,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                            lineNumber: 80,
                            columnNumber: 13
                        }, this),
                        (summary?.stale_agent_ids?.length ?? 0) > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: 12
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "small-muted",
                                    style: {
                                        marginBottom: 6
                                    },
                                    children: "Stale agents:"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 116,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 6
                                    },
                                    children: summary.stale_agent_ids.map((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            className: "button-link button-secondary",
                                            style: {
                                                fontSize: "0.75rem",
                                                padding: "2px 8px"
                                            },
                                            href: `/agents/${encodeURIComponent(id)}`,
                                            children: id
                                        }, id, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 119,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 117,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                            lineNumber: 115,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 76,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 75,
                columnNumber: 9
            }, this),
            agentsResult.ok && total > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                    title: "Policy sync state",
                    description: "Config sync posture across the fleet as reported by Mother. Mother controls assignment — no sync action is available from this page.",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pulse-grid",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "In sync"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 138,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                tone: syncOk > 0 ? "success" : "neutral",
                                                children: syncOk
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 139,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 137,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: syncOk
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 141,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: "Config acknowledged by agent"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 142,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 136,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Pending"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 146,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                tone: syncPending > 0 ? "warning" : "neutral",
                                                children: syncPending
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 147,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 145,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: syncPending
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 149,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: "Awaiting delivery or acknowledgment"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 150,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 144,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Stale / error"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 154,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                tone: syncStale > 0 ? "danger" : "neutral",
                                                children: syncStale
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 155,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 153,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: syncStale
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 157,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: "Config delivery failed or version mismatch"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 158,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 152,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Posture"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 162,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                tone: syncPostureTone,
                                                children: syncPostureTone === "success" ? "In sync" : syncPostureTone === "danger" ? "Action needed" : syncPostureTone === "warning" ? "Pending" : "Unknown"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 163,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 161,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: summary?.configs_pending_delivery ?? syncPending
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 165,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: "Configs pending delivery"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 166,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 160,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 135,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 131,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 130,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                    title: "Agent registry",
                    description: "Click an agent to inspect telemetry, config history, events, and alerts.",
                    children: agentsResult.ok ? agents.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "agent-section-head",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "agent-section-count",
                                    children: [
                                        agents.length,
                                        " agent",
                                        agents.length === 1 ? "" : "s",
                                        " registered"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 178,
                                    columnNumber: 53
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 178,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "agent-grid",
                                children: agents.map((agent, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AgentCard"], {
                                        agent: agent,
                                        href: agent.agent_id ? `/agents/${encodeURIComponent(agent.agent_id)}` : undefined
                                    }, agent.agent_id || `agent-${index}`, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 181,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 179,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true) : /* R10.16: Connect / install guidance when no agents */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                                tone: "info",
                                icon: "◉",
                                title: "No agents registered",
                                description: "Agents appear here automatically after a policy pull or telemetry push reaches Mother."
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 188,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "checklist-cards",
                                style: {
                                    marginTop: 16
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "checklist-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-icon",
                                                children: "1"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 191,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-text",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        children: "Install the agent binary"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 192,
                                                        columnNumber: 59
                                                    }, this),
                                                    " on each host using the build script at ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "mono",
                                                        children: "agent/scripts/build.sh"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 192,
                                                        columnNumber: 130
                                                    }, this),
                                                    "."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 192,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 190,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "checklist-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-icon",
                                                children: "2"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 195,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-text",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        children: "Configure Mother endpoint"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 59
                                                    }, this),
                                                    " in ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "mono",
                                                        children: "agent/configs/agent.example.yml"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 95
                                                    }, this),
                                                    ": set ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "mono",
                                                        children: "mother_base_url"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 162
                                                    }, this),
                                                    " to this Mother instance."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 196,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 194,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "checklist-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-icon",
                                                children: "3"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 199,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-text",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        children: "Start the agent service"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 200,
                                                        columnNumber: 59
                                                    }, this),
                                                    " using systemd (",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "mono",
                                                        children: "agent/systemd/unixsee-agent.service"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 200,
                                                        columnNumber: 105
                                                    }, this),
                                                    ") or the run script."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 200,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 198,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "checklist-card",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-icon",
                                                children: "4"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 203,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "checklist-card-text",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                        children: "Wait for first policy pull."
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                        lineNumber: 204,
                                                        columnNumber: 59
                                                    }, this),
                                                    " Mother registers the agent automatically on first contact. Refresh this page after 30–60 seconds."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 204,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 202,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 189,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 187,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$ErrorState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ErrorState"], {
                        error: agentsResult.error
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 210,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 174,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 173,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                    title: "Registry table",
                    description: "Full fleet detail with sync and telemetry state per agent.",
                    children: agentsResult.ok ? agents.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$DataTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DataTable"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Agent ID"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 28
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Status"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Telemetry"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 60
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Last telemetry"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 78
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Match rate"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 101
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Config sync"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 120
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Received"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 140
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {}, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                            lineNumber: 220,
                                            columnNumber: 157
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                    lineNumber: 220,
                                    columnNumber: 24
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 220,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: agents.map((agent, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "mono",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.agent_id)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 224,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    value: agent.status || "unknown"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 225,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 225,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    value: agent.telemetry_status || "missing"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 226,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 226,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "mono",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_telemetry_at)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 227,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: pct(agent.last_match_rate)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 228,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                    value: agent.config_sync_status || "unknown"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 229,
                                                    columnNumber: 27
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 229,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(agent.last_received)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 230,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: agent.agent_id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    className: "button-link button-secondary",
                                                    href: `/agents/${encodeURIComponent(agent.agent_id)}`,
                                                    children: "Open"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                    lineNumber: 231,
                                                    columnNumber: 45
                                                }, this) : null
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                                lineNumber: 231,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, agent.agent_id || `agent-row-${index}`, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                        lineNumber: 223,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                                lineNumber: 221,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 219,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                        tone: "info",
                        icon: "▤",
                        title: "No rows to display",
                        description: "The registry table will populate once agents are known to Mother."
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 237,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$ErrorState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ErrorState"], {
                        error: agentsResult.error
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                        lineNumber: 240,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 216,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 215,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RawJsonDrawer"], {
                    data: agentsResult.ok ? agentsResult.data : agentsResult,
                    title: "Raw Mother registry"
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                    lineNumber: 246,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx",
                lineNumber: 245,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
}),
"[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/(dashboard)/agents/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1j6ep7z._.js.map