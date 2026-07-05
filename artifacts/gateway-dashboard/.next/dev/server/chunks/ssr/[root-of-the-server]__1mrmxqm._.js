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
"[project]/artifacts/gateway-dashboard/lib/dashboard/mappers.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countAgents",
    ()=>countAgents,
    "emptyAlertSummary",
    ()=>emptyAlertSummary,
    "emptyReleaseSummary",
    ()=>emptyReleaseSummary,
    "releaseLabel",
    ()=>releaseLabel
]);
function countAgents(agents) {
    const online = agents.filter((agent)=>agent.status === "online").length;
    const stale = agents.filter((agent)=>agent.status === "stale").length;
    return {
        total: agents.length,
        online,
        stale,
        unknown: Math.max(0, agents.length - online - stale),
        freshTelemetry: agents.filter((agent)=>agent.telemetry_status === "fresh").length
    };
}
function releaseLabel(summary) {
    if (!summary) return "Unknown";
    if ((summary.fail || 0) > 0 || (summary.blockers || []).length > 0) return "Blocked";
    if ((summary.warn || 0) > 0 || (summary.unknown || 0) > 0 || (summary.skipped || 0) > 0) return "Conditional";
    return summary.ready ? "Ready" : "Needs review";
}
function emptyAlertSummary() {
    return {
        ok: true,
        active_total: 0,
        critical: 0,
        warn: 0,
        info: 0,
        muted: 0,
        resolved_24h: 0,
        latest: []
    };
}
function emptyReleaseSummary() {
    return {
        ok: true,
        ready: false,
        label: "Unknown",
        total: 0,
        pass: 0,
        warn: 0,
        fail: 0,
        skipped: 0,
        unknown: 0,
        blockers: [],
        warnings: []
    };
}
}),
"[project]/artifacts/gateway-dashboard/lib/dashboard/server-data.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDashboardOverview",
    ()=>getDashboardOverview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/api.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/dashboard/mappers.ts [app-rsc] (ecmascript)");
;
;
;
async function getDashboardOverview() {
    const [healthResult, readyResult, agentsResult, alertsResult, releaseResult, storageResult] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherHealth"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherReady"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgents"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAlertSummary"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherReleaseGateSummary"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherStorageStatus"])()
    ]);
    const agents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(agentsResult)?.agents || [];
    const counts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["countAgents"])(agents);
    return {
        health: {
            ok: Boolean((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(healthResult)?.ok),
            service: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(healthResult)?.service || "unixsee-mother",
            mode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(healthResult)?.mode || "staging"
        },
        ready: {
            ok: Boolean((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(readyResult)?.ok),
            storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(readyResult)?.storage || "unknown",
            engine: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(readyResult)?.storage_engine || "unknown"
        },
        agents: {
            ...counts,
            items: agents
        },
        alerts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(alertsResult) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["emptyAlertSummary"])(),
        release: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(releaseResult) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["emptyReleaseSummary"])(),
        storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(storageResult)
    };
}
}),
"[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OverviewPage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/AgentCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$DataTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/DataTable.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/EmptyState.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/KpiCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$PageHeader$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/PageHeader.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/RawJsonDrawer.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/SectionCard.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/StatusPill.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$server$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/dashboard/server-data.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/dashboard/mappers.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/api.ts [app-rsc] (ecmascript)");
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
;
const dynamic = "force-dynamic";
async function OverviewPage() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requirePermission"])("dashboard.view");
    const overview = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$server$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDashboardOverview"])();
    const overallTone = overview.alerts.critical ? "danger" : overview.alerts.warn || overview.agents.stale ? "warning" : "success";
    const overallLabel = overallTone === "success" ? "Healthy" : overallTone === "warning" ? "Needs review" : "Critical";
    const alertTone = (overview.alerts.critical || 0) > 0 ? "danger" : (overview.alerts.warn || 0) > 0 ? "warning" : "success";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$PageHeader$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PageHeader"], {
                eyebrow: "Unixsee Gateway",
                title: "Dashboard",
                description: "Operational view for the Mother-backed controlled beta. PHP Gateway remains the runtime source, Agents remain shadow-only, and the browser never talks to Mother directly.",
                meta: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                    tone: overallTone,
                    children: overallLabel
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                    lineNumber: 29,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "hero-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-main",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `hero-badge ${overallTone}`,
                                children: "◊"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 34,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-label",
                                        children: "Overall posture"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 36,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-value",
                                        children: overallLabel
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 37,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-sub",
                                        children: "Combined signal from Mother health, release gates, agent freshness, and active alerts."
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 38,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 35,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-stats",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Mother"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 42,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                        value: overview.health.ok ? "healthy" : "unavailable"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 42,
                                        columnNumber: 57
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 42,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Agents online"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 43,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: [
                                            overview.agents.online,
                                            "/",
                                            overview.agents.total
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 43,
                                        columnNumber: 64
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Release"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 44,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                        value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["releaseLabel"])(overview.release)
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 44,
                                        columnNumber: 58
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 44,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Safety"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 45,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                        tone: "blue",
                                        children: "Shadow"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 45,
                                        columnNumber: 57
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid kpis",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Gateway Agents",
                        value: overview.agents.total,
                        hint: `${overview.agents.online} online · ${overview.agents.stale} stale · ${overview.agents.unknown} unknown`,
                        icon: "◉",
                        tone: "blue"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Telemetry fresh",
                        value: overview.agents.freshTelemetry,
                        hint: "agents reporting fresh telemetry to Mother",
                        icon: "⌁"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 51,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Active alerts",
                        value: overview.alerts.active_total ?? 0,
                        hint: `${overview.alerts.critical || 0} critical · ${overview.alerts.warn || 0} warn`,
                        icon: "!",
                        tone: alertTone
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                        title: "Safety mode",
                        value: "Shadow",
                        hint: "no enforcement · no remote commands",
                        icon: "✓",
                        tone: "success"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                    title: "System pulse",
                    description: "Health, storage, release and alert evidence combined, without exposing secrets.",
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
                                                children: "Mother health"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 60,
                                                columnNumber: 48
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                value: overview.health.ok ? "healthy" : "unavailable"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 60,
                                                columnNumber: 74
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 60,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(overview.health.service)
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 61,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: [
                                            "mode: ",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(overview.health.mode)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 62,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 59,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Storage"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 65,
                                                columnNumber: 48
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                value: overview.ready.ok ? "ready" : "unknown"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 65,
                                                columnNumber: 68
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 65,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(overview.storage?.engine || overview.ready.engine)
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 66,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: overview.storage?.writable ? "writable" : "read-only or unknown"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 64,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Release gates"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 70,
                                                columnNumber: 48
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$dashboard$2f$mappers$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["releaseLabel"])(overview.release)
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 70,
                                                columnNumber: 74
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 70,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: [
                                            overview.release.pass || 0,
                                            " pass · ",
                                            overview.release.warn || 0,
                                            " warn · ",
                                            overview.release.fail || 0,
                                            " fail"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 71,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: [
                                            overview.release.total || 0,
                                            " evaluated total"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 72,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 69,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pulse-item",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-head",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Alert center"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 75,
                                                columnNumber: 48
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                tone: alertTone,
                                                children: alertTone === "success" ? "Clear" : alertTone === "warning" ? "Attention" : "Critical"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 75,
                                                columnNumber: 73
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 75,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-value",
                                        children: [
                                            overview.alerts.critical || 0,
                                            " critical · ",
                                            overview.alerts.warn || 0,
                                            " warn"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 76,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pulse-item-note",
                                        children: [
                                            overview.alerts.resolved_24h || 0,
                                            " resolved in last 24h"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 77,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                lineNumber: 74,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 58,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid two section-block",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                        title: "Active agents",
                        description: "Latest known Agent registry entries from Mother.",
                        action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            className: "button-link button-secondary",
                            href: "/agents",
                            children: "View all"
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                            lineNumber: 87,
                            columnNumber: 19
                        }, this),
                        children: overview.agents.items.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "agent-section-head",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "agent-section-count",
                                        children: [
                                            "Showing ",
                                            Math.min(4, overview.agents.items.length),
                                            " of ",
                                            overview.agents.items.length
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 51
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                    lineNumber: 91,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "agent-grid",
                                    children: overview.agents.items.slice(0, 4).map((agent, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AgentCard"], {
                                            agent: agent,
                                            href: agent.agent_id ? `/agents/${encodeURIComponent(agent.agent_id)}` : undefined
                                        }, agent.agent_id || `agent-${index}`, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                            lineNumber: 94,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                    lineNumber: 92,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                            tone: "info",
                            icon: "◉",
                            title: "No agents registered yet",
                            description: "Agents will appear automatically once a policy pull or telemetry push registers them with Mother."
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                            lineNumber: 99,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                        title: "Latest alerts",
                        description: "Alert Center summary without exposing secrets.",
                        children: (overview.alerts.latest || []).length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$DataTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DataTable"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Severity"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 26
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Scope"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 43
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Agent"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 57
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Title"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 71
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Last seen"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 85
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                        lineNumber: 105,
                                        columnNumber: 22
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                    lineNumber: 105,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: (overview.alerts.latest || []).slice(0, 5).map((alert)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                        value: alert.severity || "info"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                        lineNumber: 109,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                    lineNumber: 109,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(alert.scope)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                    lineNumber: 110,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "mono",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(alert.agent_id)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                    lineNumber: 111,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(alert.title)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                    lineNumber: 112,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "mono",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(alert.last_seen_at)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                                    lineNumber: 113,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, alert.id || alert.fingerprint, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                            lineNumber: 108,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                                    lineNumber: 106,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                            lineNumber: 104,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                            tone: "info",
                            icon: "✓",
                            title: "No active alerts",
                            description: "The Alert Center currently has no open items for this environment."
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                            lineNumber: 119,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "section-block",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RawJsonDrawer"], {
                    data: {
                        health: overview.health,
                        ready: overview.ready,
                        agents: overview.agents,
                        release: overview.release,
                        alerts: overview.alerts
                    },
                    title: "Raw normalized overview"
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                    lineNumber: 125,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
}),
"[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/(dashboard)/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1mrmxqm._.js.map