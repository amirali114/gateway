import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "./auth-constants";
import { can, permissionsForRole, type Permission, type Role } from "./rbac";
import { appendAudit, dashboardStoreStatus, getUserByID, safeUserForSession, touchLastLogin, verifyUserPassword, type DashboardUser } from "./user-store";

const SESSION_TTL_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  user_id: string;
  username: string;
  role: Role;
  exp: number;
  iat: number;
};

export type AuthStatus = {
  enabled: boolean;
  user_id: string;
  username: string;
  display_name: string;
  role: Role | "auth-disabled";
  permissions: Permission[];
  expiresAt?: string;
};

export function isAuthEnabled(): boolean {
  return (process.env.DASHBOARD_AUTH_ENABLED || "true").toLowerCase() !== "false";
}

export function dashboardTrustProxyEnabled(): boolean {
  return (process.env.DASHBOARD_TRUST_PROXY || "false").toLowerCase() === "true";
}

export function dashboardPublicBaseUrl(): string {
  return (process.env.DASHBOARD_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}

function sessionSecret(): string {
  const secret = process.env.DASHBOARD_SESSION_SECRET || "";
  if (!isAuthEnabled()) return "auth-disabled";
  if (secret.length < 32) {
    throw new Error("Dashboard authentication is enabled but DASHBOARD_SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function createSessionToken(user: DashboardUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { user_id: user.id, username: user.username, role: user.role, iat: now, exp: now + SESSION_TTL_SECONDS };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!isAuthEnabled()) return { user_id: "auth-disabled", username: "auth-disabled", role: "owner", iat: 0, exp: 4102444800 };
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".", 2);
  if (!encoded || !sig || !safeEqual(sign(encoded), sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.user_id || !payload.username || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function forwardedProtoIsHttps(proto: string | null): boolean {
  if (!proto) return false;
  const first = proto.split(",")[0]?.trim().toLowerCase() || "";
  return first === "https" || first === "on";
}

async function requestLooksSecure(): Promise<boolean> {
  const publicBase = dashboardPublicBaseUrl();
  if (publicBase.toLowerCase().startsWith("https://")) return true;
  if (!dashboardTrustProxyEnabled()) return false;
  const h = await headers();
  return forwardedProtoIsHttps(h.get("x-forwarded-proto")) || forwardedProtoIsHttps(h.get("x-forwarded-ssl"));
}

async function secureCookieEnabled(): Promise<boolean> {
  return requestLooksSecure();
}

function remoteIPFromHeaders(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function verifyDashboardPassword(username: string, password: string): Promise<DashboardUser | null> {
  if (!isAuthEnabled()) return { id: "auth-disabled", username: "auth-disabled", display_name: "auth-disabled", role: "owner", status: "active", password_hash: "", created_at: "", updated_at: "" };
  const h = await headers();
  const user = await verifyUserPassword(username, password);
  await appendAudit({ actor: user, action: user ? "login_success" : "login_failure", target_type: "user", target_id: username.trim().toLowerCase().slice(0, 64), result: user ? "success" : "failure", ip: remoteIPFromHeaders(h), userAgent: h.get("user-agent") });
  if (user) touchLastLogin(user.id);
  return user;
}

export async function setDashboardSession(user: DashboardUser): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookieEnabled(),
    maxAge: SESSION_TTL_SECONDS,
    path: "/"
  });
}

export async function clearDashboardSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: await secureCookieEnabled(), maxAge: 0, path: "/" });
}

export async function currentSession(): Promise<AuthStatus | null> {
  if (!isAuthEnabled()) return { enabled: false, user_id: "auth-disabled", username: "auth-disabled", display_name: "auth-disabled", role: "auth-disabled", permissions: permissionsForRole("owner") };
  const jar = await cookies();
  const session = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = getUserByID(session.user_id);
  if (!user || user.status !== "active" || user.username !== session.username || user.role !== session.role) return null;
  return { enabled: true, ...safeUserForSession(user), expiresAt: new Date(session.exp * 1000).toISOString() };
}

export async function requireDashboardAuth(): Promise<AuthStatus> {
  if (!isAuthEnabled()) return { enabled: false, user_id: "auth-disabled", username: "auth-disabled", display_name: "auth-disabled", role: "auth-disabled", permissions: permissionsForRole("owner") };
  const status = await currentSession();
  if (!status) redirect("/login");
  return status;
}

export async function requirePermission(permission: Permission): Promise<AuthStatus> {
  const auth = await requireDashboardAuth();
  if (auth.role !== "auth-disabled" && !can(auth.role, permission)) {
    const h = await headers();
    await appendAudit({ actor: { id: auth.user_id, username: auth.username, role: auth.role as "owner" | "admin" | "operator" | "viewer" }, action: "permission_denied", target_type: "permission", target_id: permission, result: "failure", ip: remoteIPFromHeaders(h), userAgent: h.get("user-agent") });
    throw new Error("You do not have permission to perform this operation.");
  }
  return auth;
}

export function hasPermission(auth: AuthStatus, permission: Permission): boolean {
  return auth.role === "auth-disabled" || can(auth.role, permission);
}

export function motherActorHeaders(auth: AuthStatus): Record<string, string> {
  if (auth.role === "auth-disabled") return { "X-Unixsee-Actor-ID": "auth-disabled", "X-Unixsee-Actor-Username": "auth-disabled", "X-Unixsee-Actor-Role": "owner" };
  return { "X-Unixsee-Actor-ID": auth.user_id, "X-Unixsee-Actor-Username": auth.username, "X-Unixsee-Actor-Role": auth.role };
}

export async function dashboardSecuritySummary() {
  const enabled = isAuthEnabled();
  const publicBase = dashboardPublicBaseUrl();
  const store = dashboardStoreStatus();
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
    current_user: current ? { username: current.username, role: current.role, permissions: current.permissions } : null
  };
}
