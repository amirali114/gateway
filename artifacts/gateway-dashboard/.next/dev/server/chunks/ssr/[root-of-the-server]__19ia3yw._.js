module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/artifacts/gateway-dashboard/lib/auth-constants.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SESSION_COOKIE",
    ()=>SESSION_COOKIE
]);
const SESSION_COOKIE = "uxgw_session";
}),
"[project]/artifacts/gateway-dashboard/lib/rbac.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PERMISSIONS",
    ()=>PERMISSIONS,
    "ROLES",
    ()=>ROLES,
    "can",
    ()=>can,
    "isRole",
    ()=>isRole,
    "permissionLabel",
    ()=>permissionLabel,
    "permissionsForRole",
    ()=>permissionsForRole,
    "roleLabel",
    ()=>roleLabel
]);
const ROLES = [
    "owner",
    "admin",
    "operator",
    "viewer"
];
const PERMISSIONS = [
    "dashboard.view",
    "agents.view",
    "gateway.view",
    "gateway.draft.write",
    "gateway.publish",
    "gateway.rollback",
    "gateway.config.validate",
    "gateway.config.publish",
    "gateway.config.rollback",
    "policy.view",
    "diagnostics.view",
    "alerts.view",
    "alerts.manage",
    "release.view",
    "settings.view",
    "users.view",
    "users.manage",
    "audit.view"
];
const rolePermissions = {
    owner: [
        ...PERMISSIONS
    ],
    admin: [
        "dashboard.view",
        "agents.view",
        "gateway.view",
        "gateway.draft.write",
        "gateway.publish",
        "gateway.rollback",
        "gateway.config.validate",
        "gateway.config.publish",
        "gateway.config.rollback",
        "policy.view",
        "diagnostics.view",
        "alerts.view",
        "alerts.manage",
        "release.view",
        "settings.view",
        "users.view",
        "audit.view"
    ],
    operator: [
        "dashboard.view",
        "agents.view",
        "gateway.view",
        "gateway.draft.write",
        "policy.view",
        "diagnostics.view",
        "alerts.view",
        "release.view"
    ],
    viewer: [
        "dashboard.view",
        "agents.view",
        "gateway.view",
        "policy.view",
        "diagnostics.view",
        "alerts.view",
        "release.view"
    ]
};
function isRole(value) {
    return ROLES.includes(value);
}
function permissionsForRole(role) {
    return rolePermissions[role] || [];
}
function can(role, permission) {
    return permissionsForRole(role).includes(permission);
}
function roleLabel(role) {
    switch(role){
        case "owner":
            return "Owner";
        case "admin":
            return "Admin";
        case "operator":
            return "Operator";
        case "viewer":
            return "Viewer";
        default:
            return "Unknown";
    }
}
function permissionLabel(permission) {
    const labels = {
        "dashboard.view": "View dashboard",
        "agents.view": "View agents",
        "gateway.view": "View gateway control",
        "gateway.draft.write": "Write config draft",
        "gateway.publish": "Publish config",
        "gateway.rollback": "Rollback config",
        "gateway.config.validate": "Validate config draft",
        "gateway.config.publish": "Publish config (workflow)",
        "gateway.config.rollback": "Rollback config (workflow)",
        "policy.view": "View policies",
        "diagnostics.view": "View diagnostics",
        "alerts.view": "View alerts",
        "alerts.manage": "Manage alerts",
        "release.view": "View release readiness",
        "settings.view": "View settings",
        "users.view": "View users",
        "users.manage": "Manage users",
        "audit.view": "View audit trail"
    };
    return labels[permission] || permission;
}
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/artifacts/gateway-dashboard/lib/user-store.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appendAudit",
    ()=>appendAudit,
    "createUser",
    ()=>createUser,
    "dashboardStoreStatus",
    ()=>dashboardStoreStatus,
    "getUserByID",
    ()=>getUserByID,
    "getUserByUsername",
    ()=>getUserByUsername,
    "listAuditEvents",
    ()=>listAuditEvents,
    "listUsers",
    ()=>listUsers,
    "resetUserPassword",
    ()=>resetUserPassword,
    "safeUserForSession",
    ()=>safeUserForSession,
    "touchLastLogin",
    ()=>touchLastLogin,
    "updateUser",
    ()=>updateUser,
    "verifyUserPassword",
    ()=>verifyUserPassword
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/rbac.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const DEFAULT_STORE_PATH = "/var/lib/unixsee-gateway/dashboard";
function storeDir() {
    return (process.env.DASHBOARD_USER_STORE_PATH || DEFAULT_STORE_PATH).trim();
}
function usersFile() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(storeDir(), "users.json");
}
function auditFile() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(storeDir(), "audit.jsonl");
}
function nowISO() {
    return new Date().toISOString();
}
function ensureDir() {
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(storeDir(), {
        recursive: true,
        mode: 0o750
    });
}
function atomicWriteJSON(file, data) {
    ensureDir();
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(tmp, payload, {
        mode: 0o640
    });
    try {
        const fd = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].openSync(tmp, "r");
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].fsyncSync(fd);
        } finally{
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].closeSync(fd);
        }
    } catch  {}
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(file)) {
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].copyFileSync(file, `${file}.bak`);
        } catch  {}
    }
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].renameSync(tmp, file);
}
function safeMetadata(metadata) {
    if (!metadata) return undefined;
    const out = {};
    for (const [key, value] of Object.entries(metadata)){
        const lower = key.toLowerCase();
        if (lower.includes("password") || lower.includes("token") || lower.includes("secret") || lower.includes("cookie")) continue;
        if (typeof value === "string") out[key] = value.slice(0, 300);
        else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
        else out[key] = JSON.parse(JSON.stringify(value)).toString?.() ? value : "[object]";
    }
    return out;
}
function hashValue(value) {
    if (!value) return undefined;
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHash("sha256").update(value).digest("hex").slice(0, 24);
}
function normalizeUsername(username) {
    return username.trim().toLowerCase();
}
function validateUsername(username) {
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) throw new Error("invalid_username");
}
function validatePasswordHash(hash) {
    if (!hash || !hash.startsWith("$2")) throw new Error("password_hash_missing_or_invalid");
}
function bootstrapUser() {
    const username = normalizeUsername(process.env.DASHBOARD_BOOTSTRAP_ADMIN_USERNAME || process.env.DASHBOARD_ADMIN_USERNAME || "");
    const password_hash = process.env.DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH || process.env.DASHBOARD_ADMIN_PASSWORD_HASH || "";
    if (!username || !password_hash) return null;
    validateUsername(username);
    validatePasswordHash(password_hash);
    const at = nowISO();
    return {
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        username,
        display_name: username,
        email: process.env.DASHBOARD_BOOTSTRAP_ADMIN_EMAIL || undefined,
        role: "owner",
        status: "active",
        password_hash,
        created_at: at,
        updated_at: at,
        password_changed_at: at
    };
}
function emptyStore() {
    return {
        storage_version: 1,
        users: []
    };
}
function readRawStore() {
    ensureDir();
    const file = usersFile();
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(file)) {
        const user = bootstrapUser();
        const initial = {
            storage_version: 1,
            users: user ? [
                user
            ] : []
        };
        atomicWriteJSON(file, initial);
        return initial;
    }
    try {
        const parsed = JSON.parse(__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(file, "utf8"));
        if (!Array.isArray(parsed.users)) return emptyStore();
        return {
            storage_version: 1,
            users: parsed.users
        };
    } catch (err) {
        const bak = `${file}.bak`;
        if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(bak)) {
            const parsed = JSON.parse(__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(bak, "utf8"));
            return {
                storage_version: 1,
                users: Array.isArray(parsed.users) ? parsed.users : []
            };
        }
        throw err;
    }
}
function writeRawStore(store) {
    atomicWriteJSON(usersFile(), {
        storage_version: 1,
        users: store.users
    });
}
function dashboardStoreStatus() {
    const dir = storeDir();
    let writable = false;
    let users = 0;
    let last_error = "";
    try {
        ensureDir();
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].accessSync(dir, __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].constants.W_OK);
        writable = true;
        users = readRawStore().users.length;
    } catch (err) {
        last_error = err instanceof Error ? err.message.slice(0, 180) : "storage error";
    }
    return {
        path: dir,
        users_file: usersFile(),
        audit_file: auditFile(),
        writable,
        users,
        last_error
    };
}
function listUsers() {
    return readRawStore().users.map((u)=>({
            ...u,
            password_hash: ""
        }));
}
function getUserByID(id) {
    return readRawStore().users.find((u)=>u.id === id) || null;
}
function getUserByUsername(username) {
    const normalized = normalizeUsername(username);
    return readRawStore().users.find((u)=>u.username === normalized) || null;
}
async function verifyUserPassword(username, password) {
    const user = getUserByUsername(username);
    if (!user || user.status !== "active") return null;
    const ok = await __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].compare(password, user.password_hash);
    return ok ? user : null;
}
function touchLastLogin(userID) {
    const store = readRawStore();
    const idx = store.users.findIndex((u)=>u.id === userID);
    if (idx >= 0) {
        store.users[idx] = {
            ...store.users[idx],
            last_login_at: nowISO(),
            updated_at: nowISO()
        };
        writeRawStore(store);
    }
}
function ownerCount(users) {
    return users.filter((u)=>u.role === "owner" && u.status === "active").length;
}
function assertCanChangeOwner(store, target, nextRole, nextStatus) {
    if (!target || target.role !== "owner" || target.status !== "active") return;
    const removingOwner = nextRole && nextRole !== "owner" || nextStatus && nextStatus !== "active";
    if (removingOwner && ownerCount(store.users) <= 1) throw new Error("cannot_disable_or_downgrade_last_owner");
}
async function createUser(input, actor) {
    const username = normalizeUsername(input.username);
    validateUsername(username);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isRole"])(input.role)) throw new Error("invalid_role");
    if (!input.password || input.password.length < 10) throw new Error("password_too_short");
    const store = readRawStore();
    if (store.users.some((u)=>u.username === username)) throw new Error("username_exists");
    const at = nowISO();
    const password_hash = await __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].hash(input.password, 12);
    const user = {
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        username,
        display_name: (input.display_name || username).trim(),
        email: (input.email || "").trim() || undefined,
        role: input.role,
        status: input.status || "active",
        password_hash,
        created_at: at,
        updated_at: at,
        password_changed_at: at
    };
    store.users.push(user);
    writeRawStore(store);
    await appendAudit({
        actor,
        action: "user_created",
        target_type: "user",
        target_id: user.username,
        result: "success",
        metadata: {
            role: user.role,
            status: user.status
        }
    });
    return {
        ...user,
        password_hash: ""
    };
}
async function updateUser(id, updates, actor) {
    const store = readRawStore();
    const idx = store.users.findIndex((u)=>u.id === id);
    if (idx < 0) throw new Error("user_not_found");
    const current = store.users[idx];
    const nextRole = updates.role && (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isRole"])(updates.role) ? updates.role : current.role;
    const nextStatus = updates.status === "disabled" || updates.status === "active" ? updates.status : current.status;
    assertCanChangeOwner(store, current, nextRole, nextStatus);
    const next = {
        ...current,
        display_name: updates.display_name?.trim() || current.display_name,
        email: updates.email?.trim() || undefined,
        role: nextRole,
        status: nextStatus,
        updated_at: nowISO()
    };
    store.users[idx] = next;
    writeRawStore(store);
    await appendAudit({
        actor,
        action: nextStatus === "disabled" ? "user_disabled" : "user_updated",
        target_type: "user",
        target_id: next.username,
        result: "success",
        metadata: {
            role: next.role,
            status: next.status
        }
    });
    return {
        ...next,
        password_hash: ""
    };
}
async function resetUserPassword(id, newPassword, actor) {
    if (!newPassword || newPassword.length < 10) throw new Error("password_too_short");
    const store = readRawStore();
    const idx = store.users.findIndex((u)=>u.id === id);
    if (idx < 0) throw new Error("user_not_found");
    store.users[idx] = {
        ...store.users[idx],
        password_hash: await __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].hash(newPassword, 12),
        password_changed_at: nowISO(),
        updated_at: nowISO()
    };
    writeRawStore(store);
    await appendAudit({
        actor,
        action: "password_reset",
        target_type: "user",
        target_id: store.users[idx].username,
        result: "success"
    });
}
async function appendAudit({ actor, action, target_type, target_id, result, metadata, ip, userAgent }) {
    ensureDir();
    const event = {
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        timestamp: nowISO(),
        actor_user_id: actor?.id || "system",
        actor_username: actor?.username || "system",
        actor_role: actor?.role || "system",
        action,
        target_type,
        target_id: target_id.slice(0, 180),
        result,
        ip_hash: hashValue(ip),
        user_agent_hash: hashValue(userAgent),
        metadata: safeMetadata(metadata)
    };
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].appendFileSync(auditFile(), `${JSON.stringify(event)}\n`, {
        mode: 0o640
    });
}
function listAuditEvents(limit = 250) {
    ensureDir();
    const file = auditFile();
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(file)) return [];
    const lines = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(file, "utf8").trim().split("\n").filter(Boolean).slice(-limit);
    return lines.map((line)=>{
        try {
            return JSON.parse(line);
        } catch  {
            return null;
        }
    }).filter((e)=>Boolean(e)).reverse();
}
function safeUserForSession(user) {
    return {
        user_id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        permissions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["permissionsForRole"])(user.role)
    };
}
}),
"[project]/artifacts/gateway-dashboard/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearDashboardSession",
    ()=>clearDashboardSession,
    "currentSession",
    ()=>currentSession,
    "dashboardPublicBaseUrl",
    ()=>dashboardPublicBaseUrl,
    "dashboardSecuritySummary",
    ()=>dashboardSecuritySummary,
    "dashboardTrustProxyEnabled",
    ()=>dashboardTrustProxyEnabled,
    "hasPermission",
    ()=>hasPermission,
    "isAuthEnabled",
    ()=>isAuthEnabled,
    "motherActorHeaders",
    ()=>motherActorHeaders,
    "requireDashboardAuth",
    ()=>requireDashboardAuth,
    "requirePermission",
    ()=>requirePermission,
    "setDashboardSession",
    ()=>setDashboardSession,
    "verifyDashboardPassword",
    ()=>verifyDashboardPassword,
    "verifySessionToken",
    ()=>verifySessionToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/auth-constants.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/rbac.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/user-store.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
function isAuthEnabled() {
    return (process.env.DASHBOARD_AUTH_ENABLED || "true").toLowerCase() !== "false";
}
function dashboardTrustProxyEnabled() {
    return (process.env.DASHBOARD_TRUST_PROXY || "false").toLowerCase() === "true";
}
function dashboardPublicBaseUrl() {
    return (process.env.DASHBOARD_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}
function sessionSecret() {
    const secret = process.env.DASHBOARD_SESSION_SECRET || "";
    if (!isAuthEnabled()) return "auth-disabled";
    if (secret.length < 32) {
        throw new Error("Dashboard authentication is enabled but DASHBOARD_SESSION_SECRET is missing or shorter than 32 characters.");
    }
    return secret;
}
function b64url(input) {
    return Buffer.from(input).toString("base64url");
}
function sign(value) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}
function safeEqual(a, b) {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    if (aa.length !== bb.length) return false;
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].timingSafeEqual(aa, bb);
}
function createSessionToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        user_id: user.id,
        username: user.username,
        role: user.role,
        iat: now,
        exp: now + SESSION_TTL_SECONDS
    };
    const encoded = b64url(JSON.stringify(payload));
    return `${encoded}.${sign(encoded)}`;
}
function verifySessionToken(token) {
    if (!isAuthEnabled()) return {
        user_id: "auth-disabled",
        username: "auth-disabled",
        role: "owner",
        iat: 0,
        exp: 4102444800
    };
    if (!token || !token.includes(".")) return null;
    const [encoded, sig] = token.split(".", 2);
    if (!encoded || !sig || !safeEqual(sign(encoded), sig)) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (!payload.user_id || !payload.username || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch  {
        return null;
    }
}
function forwardedProtoIsHttps(proto) {
    if (!proto) return false;
    const first = proto.split(",")[0]?.trim().toLowerCase() || "";
    return first === "https" || first === "on";
}
async function requestLooksSecure() {
    const publicBase = dashboardPublicBaseUrl();
    if (publicBase.toLowerCase().startsWith("https://")) return true;
    if (!dashboardTrustProxyEnabled()) return false;
    const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
    return forwardedProtoIsHttps(h.get("x-forwarded-proto")) || forwardedProtoIsHttps(h.get("x-forwarded-ssl"));
}
async function secureCookieEnabled() {
    return requestLooksSecure();
}
function remoteIPFromHeaders(h) {
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
async function verifyDashboardPassword(username, password) {
    if (!isAuthEnabled()) return {
        id: "auth-disabled",
        username: "auth-disabled",
        display_name: "auth-disabled",
        role: "owner",
        status: "active",
        password_hash: "",
        created_at: "",
        updated_at: ""
    };
    const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyUserPassword"])(username, password);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
        actor: user,
        action: user ? "login_success" : "login_failure",
        target_type: "user",
        target_id: username.trim().toLowerCase().slice(0, 64),
        result: user ? "success" : "failure",
        ip: remoteIPFromHeaders(h),
        userAgent: h.get("user-agent")
    });
    if (user) (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["touchLastLogin"])(user.id);
    return user;
}
async function setDashboardSession(user) {
    const jar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    jar.set(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SESSION_COOKIE"], createSessionToken(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: await secureCookieEnabled(),
        maxAge: SESSION_TTL_SECONDS,
        path: "/"
    });
}
async function clearDashboardSession() {
    const jar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    jar.set(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SESSION_COOKIE"], "", {
        httpOnly: true,
        sameSite: "lax",
        secure: await secureCookieEnabled(),
        maxAge: 0,
        path: "/"
    });
}
async function currentSession() {
    if (!isAuthEnabled()) return {
        enabled: false,
        user_id: "auth-disabled",
        username: "auth-disabled",
        display_name: "auth-disabled",
        role: "auth-disabled",
        permissions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["permissionsForRole"])("owner")
    };
    const jar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    const session = verifySessionToken(jar.get(__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2d$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SESSION_COOKIE"])?.value);
    if (!session) return null;
    const user = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserByID"])(session.user_id);
    if (!user || user.status !== "active" || user.username !== session.username || user.role !== session.role) return null;
    return {
        enabled: true,
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["safeUserForSession"])(user),
        expiresAt: new Date(session.exp * 1000).toISOString()
    };
}
async function requireDashboardAuth() {
    if (!isAuthEnabled()) return {
        enabled: false,
        user_id: "auth-disabled",
        username: "auth-disabled",
        display_name: "auth-disabled",
        role: "auth-disabled",
        permissions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["permissionsForRole"])("owner")
    };
    const status = await currentSession();
    if (!status) (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
    return status;
}
async function requirePermission(permission) {
    const auth = await requireDashboardAuth();
    if (auth.role !== "auth-disabled" && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(auth.role, permission)) {
        const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appendAudit"])({
            actor: {
                id: auth.user_id,
                username: auth.username,
                role: auth.role
            },
            action: "permission_denied",
            target_type: "permission",
            target_id: permission,
            result: "failure",
            ip: remoteIPFromHeaders(h),
            userAgent: h.get("user-agent")
        });
        throw new Error("You do not have permission to perform this operation.");
    }
    return auth;
}
function hasPermission(auth, permission) {
    return auth.role === "auth-disabled" || (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$rbac$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(auth.role, permission);
}
function motherActorHeaders(auth) {
    if (auth.role === "auth-disabled") return {
        "X-Unixsee-Actor-ID": "auth-disabled",
        "X-Unixsee-Actor-Username": "auth-disabled",
        "X-Unixsee-Actor-Role": "owner"
    };
    return {
        "X-Unixsee-Actor-ID": auth.user_id,
        "X-Unixsee-Actor-Username": auth.username,
        "X-Unixsee-Actor-Role": auth.role
    };
}
async function dashboardSecuritySummary() {
    const enabled = isAuthEnabled();
    const publicBase = dashboardPublicBaseUrl();
    const store = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$user$2d$store$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["dashboardStoreStatus"])();
    const current = await currentSession();
    return {
        auth_enabled: enabled,
        session_expiry_hours: 8,
        session_secret_configured: !enabled || (process.env.DASHBOARD_SESSION_SECRET || "").length >= 32,
        bootstrap_admin_configured: !enabled || Boolean(process.env.DASHBOARD_BOOTSTRAP_ADMIN_USERNAME || process.env.DASHBOARD_ADMIN_USERNAME),
        bootstrap_password_hash_configured: !enabled || Boolean(process.env.DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH || process.env.DASHBOARD_ADMIN_PASSWORD_HASH),
        management_token_configured: Boolean(process.env.UNIXSEE_MOTHER_MANAGEMENT_TOKEN),
        public_base_url: publicBase,
        trust_proxy: dashboardTrustProxyEnabled(),
        cookie_secure_expected: await secureCookieEnabled(),
        dashboard_bind_recommendation: "127.0.0.1:8740",
        user_store_engine: process.env.DASHBOARD_USER_STORE_ENGINE || "json",
        user_store_path: store.path,
        user_store_writable: store.writable,
        user_count: store.users,
        dashboard_postgres_configured: Boolean(process.env.DASHBOARD_POSTGRES_DSN),
        user_store_error: store.last_error,
        current_user: current ? {
            username: current.username,
            role: current.role,
            permissions: current.permissions
        } : null
    };
}
}),
"[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"408e6fd11efcdf3d7c34ae1b583302e1d9a1c0886f":{"name":"loginAction"}},"artifacts/gateway-dashboard/app/login/actions.ts",""] */ __turbopack_context__.s([
    "loginAction",
    ()=>loginAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function loginAction(formData) {
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyDashboardPassword"])(username, password);
    if (!user) (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?error=1");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setDashboardSession"])(user);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/");
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    loginAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(loginAction, "408e6fd11efcdf3d7c34ae1b583302e1d9a1c0886f", null);
}),
"[project]/artifacts/gateway-dashboard/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f$login$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/artifacts/gateway-dashboard/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "408e6fd11efcdf3d7c34ae1b583302e1d9a1c0886f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f$login$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loginAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f2e$next$2d$internal$2f$server$2f$app$2f$login$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f$login$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/artifacts/gateway-dashboard/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => "[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$gateway$2d$dashboard$2f$app$2f$login$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/gateway-dashboard/app/login/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__19ia3yw._.js.map