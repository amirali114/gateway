module.exports = [
"[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgentSelector",
    ()=>AgentSelector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/StatusPill.tsx [app-rsc] (ecmascript)");
;
;
function AgentSelector({ agents, selectedAgentId, basePath = "/gateway" }) {
    if (agents.length === 0) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "empty-state",
        children: "No agents have registered with Mother yet."
    }, void 0, false, {
        fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
        lineNumber: 5,
        columnNumber: 35
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "agent-grid",
        children: agents.map((agent, index)=>{
            const id = agent.agent_id || "";
            const active = id && id === selectedAgentId;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "agent-card",
                href: `${basePath}?agent_id=${encodeURIComponent(id)}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "agent-top",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "agent-name",
                            children: id
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
                            lineNumber: 11,
                            columnNumber: 154
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                            value: active ? "active" : agent.status || "unknown"
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
                            lineNumber: 11,
                            columnNumber: 194
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
                    lineNumber: 11,
                    columnNumber: 127
                }, this)
            }, id || `agent-${index}`, false, {
                fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
                lineNumber: 11,
                columnNumber: 16
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx",
        lineNumber: 7,
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
const rawMotherBaseUrl = process.env.UNIXSEE_MOTHER_BASE_URL || process.env.NEXT_PUBLIC_UNIXSEE_MOTHER_BASE_URL || "http://127.0.0.1:8732";
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
"[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "$$RSC_SERVER_ACTION_0",
    ()=>$$RSC_SERVER_ACTION_0,
    "default",
    ()=>GatewayPage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"40dc20cbf0523048d7e6c2a6b4386c950c81930134":{"name":"$$RSC_SERVER_ACTION_0"}},"artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",""] */ var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentSelector$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/components/AgentSelector.tsx [app-rsc] (ecmascript)");
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
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/user-store.ts [app-rsc] (ecmascript)");
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
;
;
const dynamic = "force-dynamic";
function configFrom(record) {
    const r = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["asRecord"])(record);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["asRecord"])(r.config);
}
function auditActor(auth) {
    if (auth.role === "auth-disabled") return undefined;
    return {
        id: auth.user_id,
        username: auth.username,
        role: auth.role
    };
}
const KNOWN_VALIDATE_OK = new Set([
    "valid"
]);
const KNOWN_VALIDATE_ERROR = new Set([
    "draft_unavailable",
    "validate_request_failed",
    "validation_failed"
]);
const KNOWN_OK = new Set([
    "published",
    "rolled_back"
]);
const KNOWN_ERROR = new Set([
    "missing_agent_id",
    "publish_failed",
    "rollback_failed",
    "invalid_version"
]);
const $$RSC_SERVER_ACTION_0 = async function validateDraftAction(formData) {
    const a = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requirePermission"])("gateway.config.validate");
    const agentId = String(formData.get("agent_id") || "").trim();
    const actor = auditActor(a);
    if (!agentId) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
            actor,
            action: "config.validate",
            target_type: "agent_config",
            target_id: "(empty)",
            result: "failure",
            metadata: {
                error: "missing_agent_id"
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/gateway?error=missing_agent_id");
        return;
    }
    const draftResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgentConfigDraft"])(agentId);
    if (!draftResult.ok) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
            actor,
            action: "config.validate",
            target_type: "agent_config",
            target_id: agentId,
            result: "failure",
            metadata: {
                error: "draft_unavailable",
                mother_status: draftResult.status
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=draft_unavailable`);
        return;
    }
    const draft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["asRecord"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(draftResult)?.draft_config);
    const configToValidate = draft.config ?? {};
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["validateMotherAgentConfig"])(agentId, configToValidate, (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["motherActorHeaders"])(a));
    if (!result.ok) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
            actor,
            action: "config.validate",
            target_type: "agent_config",
            target_id: agentId,
            result: "failure",
            metadata: {
                mother_status: result.status
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validate_request_failed`);
        return;
    }
    const valid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(result)?.validation?.valid;
    if (!valid) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
            actor,
            action: "config.validate",
            target_type: "agent_config",
            target_id: agentId,
            result: "failure",
            metadata: {
                mother_status: result.status,
                validation_valid: false
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validation_failed`);
        return;
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
        actor,
        action: "config.validate",
        target_type: "agent_config",
        target_id: agentId,
        result: "success",
        metadata: {
            mother_status: result.status,
            validation_valid: true
        }
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_ok=valid`);
};
(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])($$RSC_SERVER_ACTION_0, "40dc20cbf0523048d7e6c2a6b4386c950c81930134", null);
async function GatewayPage({ searchParams }) {
    const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requirePermission"])("gateway.view");
    const sp = searchParams ? await searchParams : {};
    const safeValidateOk = sp.validate_ok && KNOWN_VALIDATE_OK.has(sp.validate_ok) ? sp.validate_ok : null;
    const safeValidateError = sp.validate_error && KNOWN_VALIDATE_ERROR.has(sp.validate_error) ? sp.validate_error : null;
    const safeOk = sp.ok && KNOWN_OK.has(sp.ok) ? sp.ok : null;
    const safeError = sp.error && KNOWN_ERROR.has(sp.error) ? sp.error : null;
    const canValidate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasPermission"])(auth, "gateway.config.validate");
    const canPublish = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasPermission"])(auth, "gateway.config.publish");
    const canRollback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasPermission"])(auth, "gateway.config.rollback");
    const hasAnyConfigWrite = canValidate || canPublish || canRollback;
    const agentsResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgents"])();
    const agents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(agentsResult)?.agents || [];
    const selectedAgent = sp.agent_id || agents[0]?.agent_id || "";
    const [cfgResult, diffResult, versionsResult] = selectedAgent ? await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgentConfig"])(selectedAgent),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgentConfigDiff"])(selectedAgent),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getMotherAgentConfigVersions"])(selectedAgent)
    ]) : [
        undefined,
        undefined,
        undefined
    ];
    const activeRecord = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["asRecord"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(cfgResult)?.active_config);
    const draftRecord = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["asRecord"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(cfgResult)?.draft_config);
    const activeConfig = configFrom(activeRecord);
    const versions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(versionsResult)?.versions || [];
    const dirty = Boolean((0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(diffResult)?.diff?.dirty);
    var validateDraftAction = $$RSC_SERVER_ACTION_0;
    const bannerSuffix = hasAnyConfigWrite ? "Agents run in shadow-only mode — they observe and compare, they do not enforce. Config validate, publish, and rollback controls are available below for authorised roles. These actions do not change live traffic." : "Agents run in shadow-only mode — they observe and compare, they do not enforce. This page only reflects what Mother has stored; no write, publish, or rollback action is available to your current role.";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$PageHeader$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PageHeader"], {
                eyebrow: "Gateway",
                title: "Gateway Control",
                description: hasAnyConfigWrite ? "Shadow-only control-plane view. Validate, publish, and rollback controls are available below for authorised roles." : "Safe read-only control-plane view. Write, publish, and rollback actions are not available to your current role.",
                actions: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                    tone: "blue",
                    children: "Shadow-only"
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                    lineNumber: 114,
                    columnNumber: 18
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "readonly-banner",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "◈"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: "PHP Gateway is the runtime source of truth."
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 119,
                                columnNumber: 15
                            }, this),
                            " ",
                            bannerSuffix
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            safeOk && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "readonly-banner",
                style: {
                    borderColor: "var(--success, #2e7d32)",
                    background: "var(--success-bg, #e8f5e9)"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "✓"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 124,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            safeOk === "published" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Published."
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 126,
                                        columnNumber: 42
                                    }, this),
                                    " Draft config has been promoted to active for this agent. The audit trail has been updated."
                                ]
                            }, void 0, true),
                            safeOk === "rolled_back" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Rolled back."
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 127,
                                        columnNumber: 44
                                    }, this),
                                    " Active config has been replaced with the target version for this agent. The audit trail has been updated."
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 125,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 123,
                columnNumber: 9
            }, this),
            safeError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "readonly-banner",
                style: {
                    borderColor: "var(--danger, #c62828)",
                    background: "var(--danger-bg, #fdecea)"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "✗"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 134,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: "Action failed."
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 136,
                                columnNumber: 13
                            }, this),
                            " ",
                            safeError === "missing_agent_id" && "No agent was selected. Select an agent and try again.",
                            safeError === "publish_failed" && "Mother rejected the publish request. The config was not changed. Check the audit trail for details.",
                            safeError === "rollback_failed" && "Mother rejected the rollback request. The config was not changed. Check the audit trail for details.",
                            safeError === "invalid_version" && "The rollback target version was missing or invalid. Select a valid version from the history table."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 135,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 133,
                columnNumber: 9
            }, this),
            safeValidateOk && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "readonly-banner",
                style: {
                    borderColor: "var(--success, #2e7d32)",
                    background: "var(--success-bg, #e8f5e9)"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "✓"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 147,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: "Validation passed."
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 148,
                                columnNumber: 17
                            }, this),
                            " Mother confirmed the current draft config is valid. You may proceed to publish."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 146,
                columnNumber: 9
            }, this),
            safeValidateError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "readonly-banner",
                style: {
                    borderColor: "var(--danger, #c62828)",
                    background: "var(--danger-bg, #fdecea)"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "✗"
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 154,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: "Validation failed."
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 156,
                                columnNumber: 13
                            }, this),
                            " ",
                            safeValidateError === "draft_unavailable" && "The draft config could not be fetched from Mother. Ensure a draft exists for this agent.",
                            safeValidateError === "validate_request_failed" && "Mother did not accept the validation request. Check Mother connectivity.",
                            safeValidateError === "validation_failed" && "Mother reports the draft config is invalid. Review the draft config before publishing."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 155,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 153,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hero-panel",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-main",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-badge blue",
                                children: "▣"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 166,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-label",
                                        children: "Runtime mode"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 168,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "hero-value",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                            tone: "blue",
                                            children: "Shadow-only"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 169,
                                            columnNumber: 41
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 169,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "hero-sub",
                                        children: "Live traffic is served and decided by the PHP Gateway. Agent config below is evidence of what has been synced, not an enforcement control."
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 170,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 167,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 165,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-stats",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Runtime source"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 174,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "PHP Gateway"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 174,
                                        columnNumber: 65
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 174,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Enforcement"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "None"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 62
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 175,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Agents registered"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 176,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: agents.length
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 176,
                                        columnNumber: 68
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 176,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "hero-stat",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Selected agent config"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 177,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: selectedAgent ? dirty ? "Draft differs" : "In sync" : "—"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 177,
                                        columnNumber: 72
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 177,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 173,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 164,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                title: "Select agent",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$AgentSelector$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AgentSelector"], {
                    agents: agents,
                    selectedAgentId: selectedAgent,
                    basePath: "/gateway"
                }, void 0, false, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                    lineNumber: 181,
                    columnNumber: 41
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 181,
                columnNumber: 7
            }, this),
            selectedAgent ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid kpis",
                        style: {
                            marginTop: 14
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                                title: "Agent",
                                value: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "mono",
                                    children: selectedAgent
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 185,
                                    columnNumber: 41
                                }, this),
                                icon: "◉"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 185,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                                title: "Active version",
                                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(activeRecord.version),
                                icon: "▣"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 186,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                                title: "Draft version",
                                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(draftRecord.version),
                                icon: "□"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 187,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$KpiCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KpiCard"], {
                                title: "Dirty",
                                value: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                    value: dirty
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 188,
                                    columnNumber: 41
                                }, this),
                                icon: "!",
                                tone: dirty ? "warning" : "success"
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 188,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 184,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid two",
                        style: {
                            marginTop: 14
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                                title: "Active config",
                                description: "Currently acknowledged configuration for this agent.",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RawJsonDrawer"], {
                                    data: activeConfig,
                                    title: "Active config JSON"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 191,
                                    columnNumber: 113
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 191,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                                title: "Draft diff",
                                description: "Pending differences between active and draft, if any.",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$RawJsonDrawer$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RawJsonDrawer"], {
                                    data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["read"])(diffResult)?.diff || diffResult,
                                    title: "Diff JSON"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 192,
                                    columnNumber: 111
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 192,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 190,
                        columnNumber: 9
                    }, this),
                    hasAnyConfigWrite && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                        title: "Config workflow",
                        description: "Validate, publish, or rollback the agent config. All actions are shadow-only and do not affect live PHP Gateway traffic. Every action is recorded in the audit trail.",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "readonly-banner",
                                style: {
                                    borderColor: "var(--info, #1565c0)",
                                    background: "var(--info-bg, #e3f2fd)",
                                    marginBottom: 16
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "▣"
                                    }, void 0, false, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 201,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                children: "Shadow-only mode."
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 202,
                                                columnNumber: 21
                                            }, this),
                                            " These operations update what Mother has stored for this agent. PHP Gateway continues to serve live traffic independently — no config action here changes live enforcement."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 202,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 200,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 16,
                                    alignItems: "flex-start"
                                },
                                children: [
                                    canValidate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                        action: validateDraftAction,
                                        style: {
                                            margin: 0
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "hidden",
                                                name: "agent_id",
                                                value: selectedAgent
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 208,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "submit",
                                                className: "button-secondary",
                                                children: "Validate draft"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 209,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    fontSize: 13,
                                                    color: "var(--muted)",
                                                    marginTop: 6,
                                                    maxWidth: 240
                                                },
                                                children: "Checks the current draft config against Mother's validation rules. No config change."
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 212,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 207,
                                        columnNumber: 17
                                    }, this),
                                    canPublish && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                className: "button-link",
                                                href: `/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=publish`,
                                                children: "Publish draft →"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 220,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                style: {
                                                    fontSize: 13,
                                                    color: "var(--muted)",
                                                    marginTop: 6,
                                                    maxWidth: 240
                                                },
                                                children: "Promotes the current draft to active config. Requires confirmation. Recorded in audit trail."
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 226,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 219,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                lineNumber: 205,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 196,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                        title: "Config versions",
                        description: "History of published configuration versions.",
                        children: versions.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$DataTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DataTable"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Version"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 239,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 240,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Hash"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 241,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Published"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 242,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Source"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 243,
                                                columnNumber: 17
                                            }, this),
                                            canRollback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                lineNumber: 244,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                        lineNumber: 238,
                                        columnNumber: 22
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 238,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    children: versions.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(v.version)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$StatusPill$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["StatusPill"], {
                                                        value: v.status || "unknown"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                        lineNumber: 250,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 250,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "mono",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(v.config_hash)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 251,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    className: "mono",
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(v.published_at)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 252,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["valueOrDash"])(v.source)
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 253,
                                                    columnNumber: 21
                                                }, this),
                                                canRollback && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    children: v.version != null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: `/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=rollback&version=${v.version}`,
                                                        children: "Rollback to this"
                                                    }, void 0, false, {
                                                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                        lineNumber: 257,
                                                        columnNumber: 27
                                                    }, this) : "—"
                                                }, void 0, false, {
                                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                                    lineNumber: 255,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, `${v.version}-${v.config_hash}`, true, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 248,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 246,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 237,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                            title: "No config versions"
                        }, void 0, false, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 267,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                        lineNumber: 235,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true) : agentsResult.ok ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$EmptyState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EmptyState"], {
                title: "No agent selected",
                description: "Register an Agent first, then return to this page."
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 269,
                columnNumber: 31
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$ErrorState$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ErrorState"], {
                error: agentsResult.error
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 269,
                columnNumber: 139
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$components$2f$SectionCard$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SectionCard"], {
                title: "Safety model",
                description: "What this page can and cannot do.",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "checklist-cards",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "checklist-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-icon",
                                    children: "✓"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 43
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-text",
                                    children: "The PHP Gateway remains the authoritative runtime — it serves and decides live traffic."
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 89
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 273,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "checklist-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-icon",
                                    children: "✓"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 274,
                                    columnNumber: 43
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-text",
                                    children: "Agents operate in shadow-only mode: they compare and report, they never enforce."
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 274,
                                    columnNumber: 89
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 274,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "checklist-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-icon",
                                    children: "✓"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 275,
                                    columnNumber: 43
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-text",
                                    children: "Config shown here reflects what Mother has stored, not a live control switch."
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 275,
                                    columnNumber: 89
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 275,
                            columnNumber: 11
                        }, this),
                        hasAnyConfigWrite ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "checklist-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-icon",
                                            children: "✓"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 277,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-text",
                                            children: "Validate, publish, and rollback actions are available to your role. They operate on Mother's stored config only — not live traffic."
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 277,
                                            columnNumber: 91
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 277,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "checklist-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-icon",
                                            children: "✓"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 278,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-text",
                                            children: "Every config action requires permission checked inside the server action, not only at page load."
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 278,
                                            columnNumber: 91
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 278,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "checklist-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-icon",
                                            children: "✓"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 279,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-text",
                                            children: "Publish and rollback require explicit confirmation before executing."
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 279,
                                            columnNumber: 91
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 279,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "checklist-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-icon",
                                            children: "✓"
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 280,
                                            columnNumber: 45
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "checklist-card-text",
                                            children: "Every attempt — success or failure — is appended to the audit trail."
                                        }, void 0, false, {
                                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                            lineNumber: 280,
                                            columnNumber: 91
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 280,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "checklist-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-icon",
                                    children: "✓"
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 282,
                                    columnNumber: 45
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "checklist-card-text",
                                    children: "No write, publish, or rollback action is available to your current role on this page."
                                }, void 0, false, {
                                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                                    lineNumber: 282,
                                    columnNumber: 91
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                            lineNumber: 282,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                    lineNumber: 272,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx",
                lineNumber: 271,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
}),
"[project]/artifacts/gateway-dashboard/.next-internal/server/app/(dashboard)/gateway/page/actions.js { ACTIONS_MODULE0 => \"[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f28$dashboard$292f$gateway$2f$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)");
;
}),
"[project]/artifacts/gateway-dashboard/.next-internal/server/app/(dashboard)/gateway/page/actions.js { ACTIONS_MODULE0 => \"[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "40dc20cbf0523048d7e6c2a6b4386c950c81930134",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f28$dashboard$292f$gateway$2f$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["$$RSC_SERVER_ACTION_0"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$gateway$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f28$dashboard$292f$gateway$2f$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/artifacts/gateway-dashboard/.next-internal/server/app/(dashboard)/gateway/page/actions.js { ACTIONS_MODULE0 => "[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f28$dashboard$292f$gateway$2f$page$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/(dashboard)/gateway/page.tsx [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=artifacts_gateway-dashboard_0-ardd7._.js.map