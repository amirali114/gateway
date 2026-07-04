import "server-only";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { isRole, permissionsForRole, type Role } from "./rbac";

export type UserStatus = "active" | "disabled";

export type DashboardUser = {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  role: Role;
  status: UserStatus;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  password_changed_at?: string;
};

export type AuditResult = "success" | "failure";

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor_user_id: string;
  actor_username: string;
  actor_role: Role | "system" | "unknown";
  action: string;
  target_type: string;
  target_id: string;
  result: AuditResult;
  ip_hash?: string;
  user_agent_hash?: string;
  metadata?: Record<string, unknown>;
};

type StoreFile = { storage_version: 1; users: DashboardUser[] };

type AuditActor = Pick<DashboardUser, "id" | "username" | "role">;

type UserInput = {
  username: string;
  display_name?: string;
  email?: string;
  role: Role;
  status?: UserStatus;
  password?: string;
};

const DEFAULT_STORE_PATH = "/var/lib/unixsee-gateway/dashboard";

function storeDir(): string {
  return (process.env.DASHBOARD_USER_STORE_PATH || DEFAULT_STORE_PATH).trim();
}

function usersFile(): string { return path.join(storeDir(), "users.json"); }
function auditFile(): string { return path.join(storeDir(), "audit.jsonl"); }

function nowISO(): string { return new Date().toISOString(); }

function ensureDir(): void { fs.mkdirSync(storeDir(), { recursive: true, mode: 0o750 }); }

function atomicWriteJSON(file: string, data: unknown): void {
  ensureDir();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(tmp, payload, { mode: 0o640 });
  try {
    const fd = fs.openSync(tmp, "r");
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch { /* best effort */ }
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch { /* best effort */ }
  }
  fs.renameSync(tmp, file);
}

function safeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (lower.includes("password") || lower.includes("token") || lower.includes("secret") || lower.includes("cookie")) continue;
    if (typeof value === "string") out[key] = value.slice(0, 300);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
    else out[key] = JSON.parse(JSON.stringify(value)).toString?.() ? value : "[object]";
  }
  return out;
}

function hashValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) throw new Error("invalid_username");
}

function validatePasswordHash(hash: string): void {
  if (!hash || !hash.startsWith("$2")) throw new Error("password_hash_missing_or_invalid");
}

function bootstrapUser(): DashboardUser | null {
  const username = normalizeUsername(process.env.DASHBOARD_BOOTSTRAP_ADMIN_USERNAME || process.env.DASHBOARD_ADMIN_USERNAME || "");
  const password_hash = process.env.DASHBOARD_BOOTSTRAP_ADMIN_PASSWORD_HASH || process.env.DASHBOARD_ADMIN_PASSWORD_HASH || "";
  if (!username || !password_hash) return null;
  validateUsername(username);
  validatePasswordHash(password_hash);
  const at = nowISO();
  return {
    id: crypto.randomUUID(),
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

function emptyStore(): StoreFile { return { storage_version: 1, users: [] }; }

function readRawStore(): StoreFile {
  ensureDir();
  const file = usersFile();
  if (!fs.existsSync(file)) {
    const user = bootstrapUser();
    const initial: StoreFile = { storage_version: 1, users: user ? [user] : [] };
    atomicWriteJSON(file, initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as StoreFile;
    if (!Array.isArray(parsed.users)) return emptyStore();
    return { storage_version: 1, users: parsed.users };
  } catch (err) {
    const bak = `${file}.bak`;
    if (fs.existsSync(bak)) {
      const parsed = JSON.parse(fs.readFileSync(bak, "utf8")) as StoreFile;
      return { storage_version: 1, users: Array.isArray(parsed.users) ? parsed.users : [] };
    }
    throw err;
  }
}

function writeRawStore(store: StoreFile): void {
  atomicWriteJSON(usersFile(), { storage_version: 1, users: store.users });
}

export function dashboardStoreStatus() {
  const dir = storeDir();
  let writable = false;
  let users = 0;
  let last_error = "";
  try {
    ensureDir();
    fs.accessSync(dir, fs.constants.W_OK);
    writable = true;
    users = readRawStore().users.length;
  } catch (err) {
    last_error = err instanceof Error ? err.message.slice(0, 180) : "storage error";
  }
  return { path: dir, users_file: usersFile(), audit_file: auditFile(), writable, users, last_error };
}

export function listUsers(): DashboardUser[] {
  return readRawStore().users.map((u) => ({ ...u, password_hash: "" }));
}

export function getUserByID(id: string): DashboardUser | null {
  return readRawStore().users.find((u) => u.id === id) || null;
}

export function getUserByUsername(username: string): DashboardUser | null {
  const normalized = normalizeUsername(username);
  return readRawStore().users.find((u) => u.username === normalized) || null;
}

export async function verifyUserPassword(username: string, password: string): Promise<DashboardUser | null> {
  const user = getUserByUsername(username);
  if (!user || user.status !== "active") return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

export function touchLastLogin(userID: string): void {
  const store = readRawStore();
  const idx = store.users.findIndex((u) => u.id === userID);
  if (idx >= 0) {
    store.users[idx] = { ...store.users[idx], last_login_at: nowISO(), updated_at: nowISO() };
    writeRawStore(store);
  }
}

function ownerCount(users: DashboardUser[]): number {
  return users.filter((u) => u.role === "owner" && u.status === "active").length;
}

function assertCanChangeOwner(store: StoreFile, target: DashboardUser | undefined, nextRole?: Role, nextStatus?: UserStatus): void {
  if (!target || target.role !== "owner" || target.status !== "active") return;
  const removingOwner = (nextRole && nextRole !== "owner") || (nextStatus && nextStatus !== "active");
  if (removingOwner && ownerCount(store.users) <= 1) throw new Error("cannot_disable_or_downgrade_last_owner");
}

export async function createUser(input: UserInput, actor?: AuditActor): Promise<DashboardUser> {
  const username = normalizeUsername(input.username);
  validateUsername(username);
  if (!isRole(input.role)) throw new Error("invalid_role");
  if (!input.password || input.password.length < 10) throw new Error("password_too_short");
  const store = readRawStore();
  if (store.users.some((u) => u.username === username)) throw new Error("username_exists");
  const at = nowISO();
  const password_hash = await bcrypt.hash(input.password, 12);
  const user: DashboardUser = {
    id: crypto.randomUUID(),
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
  await appendAudit({ actor, action: "user_created", target_type: "user", target_id: user.username, result: "success", metadata: { role: user.role, status: user.status } });
  return { ...user, password_hash: "" };
}

export async function updateUser(id: string, updates: Partial<Pick<DashboardUser, "display_name" | "email" | "role" | "status">>, actor?: AuditActor): Promise<DashboardUser> {
  const store = readRawStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("user_not_found");
  const current = store.users[idx];
  const nextRole = updates.role && isRole(updates.role) ? updates.role : current.role;
  const nextStatus = updates.status === "disabled" || updates.status === "active" ? updates.status : current.status;
  assertCanChangeOwner(store, current, nextRole, nextStatus);
  const next: DashboardUser = {
    ...current,
    display_name: updates.display_name?.trim() || current.display_name,
    email: updates.email?.trim() || undefined,
    role: nextRole,
    status: nextStatus,
    updated_at: nowISO()
  };
  store.users[idx] = next;
  writeRawStore(store);
  await appendAudit({ actor, action: nextStatus === "disabled" ? "user_disabled" : "user_updated", target_type: "user", target_id: next.username, result: "success", metadata: { role: next.role, status: next.status } });
  return { ...next, password_hash: "" };
}

export async function resetUserPassword(id: string, newPassword: string, actor?: AuditActor): Promise<void> {
  if (!newPassword || newPassword.length < 10) throw new Error("password_too_short");
  const store = readRawStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("user_not_found");
  store.users[idx] = { ...store.users[idx], password_hash: await bcrypt.hash(newPassword, 12), password_changed_at: nowISO(), updated_at: nowISO() };
  writeRawStore(store);
  await appendAudit({ actor, action: "password_reset", target_type: "user", target_id: store.users[idx].username, result: "success" });
}

export async function appendAudit({ actor, action, target_type, target_id, result, metadata, ip, userAgent }: { actor?: Pick<DashboardUser, "id" | "username" | "role"> | null; action: string; target_type: string; target_id: string; result: AuditResult; metadata?: Record<string, unknown>; ip?: string | null; userAgent?: string | null; }): Promise<void> {
  ensureDir();
  const event: AuditEvent = {
    id: crypto.randomUUID(),
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
  fs.appendFileSync(auditFile(), `${JSON.stringify(event)}\n`, { mode: 0o640 });
}

export function listAuditEvents(limit = 250): AuditEvent[] {
  ensureDir();
  const file = auditFile();
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).slice(-limit);
  return lines.map((line) => {
    try { return JSON.parse(line) as AuditEvent; } catch { return null; }
  }).filter((e): e is AuditEvent => Boolean(e)).reverse();
}

export function safeUserForSession(user: DashboardUser) {
  return { user_id: user.id, username: user.username, display_name: user.display_name, role: user.role, permissions: permissionsForRole(user.role) };
}
