import { redirect } from "next/navigation";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { currentSession, hasPermission, requirePermission } from "../../../lib/auth";
import { ROLES, roleLabel, type Role } from "../../../lib/rbac";
import { createUser, listUsers, resetUserPassword, updateUser } from "../../../lib/user-store";

export const dynamic = "force-dynamic";

function actorFromAuth(auth: Awaited<ReturnType<typeof currentSession>>) {
  return auth && auth.role !== "auth-disabled" ? { id: auth.user_id, username: auth.username, role: auth.role as Role } : undefined;
}

export default async function UsersPage({ searchParams }: { searchParams?: Promise<{ error?: string; ok?: string }> }) {
  const auth = await requirePermission("users.view");
  const canManage = hasPermission(auth, "users.manage");
  const sp = searchParams ? await searchParams : {};

  async function createUserAction(formData: FormData) {
    "use server";
    const current = await requirePermission("users.manage");
    try {
      await createUser({ username: String(formData.get("username") || ""), display_name: String(formData.get("display_name") || ""), email: String(formData.get("email") || ""), role: String(formData.get("role") || "viewer") as Role, password: String(formData.get("password") || "") }, actorFromAuth(current));
      redirect("/users?ok=created");
    } catch (err) { redirect(`/users?error=${encodeURIComponent(err instanceof Error ? err.message : "create_failed")}`); }
  }
  async function updateUserAction(formData: FormData) {
    "use server";
    const current = await requirePermission("users.manage");
    try {
      await updateUser(String(formData.get("id") || ""), { display_name: String(formData.get("display_name") || ""), email: String(formData.get("email") || ""), role: String(formData.get("role") || "viewer") as Role, status: String(formData.get("status") || "active") as "active" | "disabled" }, actorFromAuth(current));
      redirect("/users?ok=updated");
    } catch (err) { redirect(`/users?error=${encodeURIComponent(err instanceof Error ? err.message : "update_failed")}`); }
  }
  async function resetPasswordAction(formData: FormData) {
    "use server";
    const current = await requirePermission("users.manage");
    try { await resetUserPassword(String(formData.get("id") || ""), String(formData.get("new_password") || ""), actorFromAuth(current)); redirect("/users?ok=password_reset"); }
    catch (err) { redirect(`/users?error=${encodeURIComponent(err instanceof Error ? err.message : "password_reset_failed")}`); }
  }

  const users = listUsers();
  const activeCount = users.filter((u) => u.status === "active").length;
  const disabledCount = users.length - activeCount;
  const roleCounts = ROLES.map((r) => ({ role: r, count: users.filter((u) => u.role === r).length })).filter((r) => r.count > 0);

  return (
    <>
      <PageHeader eyebrow="Access" title="Users & RBAC" description="Local dashboard users and roles. Password hashes are never displayed." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Scoped to dashboard accounts only.</b> This page manages who can view and operate this dashboard. Password hashes are never displayed, there is no user-deletion control, and nothing here touches Mother, Agent, or PHP Gateway credentials.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className="hero-badge blue">◉</div>
          <div>
            <div className="hero-label">RBAC posture</div>
            <div className="hero-value">{users.length} dashboard user{users.length === 1 ? "" : "s"}</div>
            <p className="hero-sub">{canManage ? "You have users.manage permission — edits and password resets below take effect immediately." : "You have view-only access — editing controls are disabled below."}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Active</span><b>{activeCount}</b></div>
          <div className="hero-stat"><span>Disabled</span><b>{disabledCount}</b></div>
          <div className="hero-stat"><span>Roles in use</span><b>{roleCounts.length}</b></div>
          <div className="hero-stat"><span>Account deletion</span><b>Not available</b></div>
        </div>
      </div>

      {sp.error ? <ErrorState title="Operation failed" error={sp.error} /> : null}
      {sp.ok ? <div className="notice">Operation completed: {sp.ok}</div> : null}

      <SectionCard title="Users">
        <DataTable><thead><tr><th>Username</th><th>Display name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Update</th><th>Password</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td className="mono">{u.username}</td><td>{u.display_name}</td><td className="mono">{u.email || "—"}</td><td>{roleLabel(u.role)}</td><td><StatusPill value={u.status} /></td><td className="mono">{u.last_login_at || "—"}</td><td><form action={updateUserAction} className="inline-form"><input type="hidden" name="id" value={u.id} /><input name="display_name" defaultValue={u.display_name} placeholder="Display name" disabled={!canManage} /><input name="email" defaultValue={u.email || ""} placeholder="email" disabled={!canManage} /><select name="role" defaultValue={u.role} disabled={!canManage}>{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select><select name="status" defaultValue={u.status} disabled={!canManage}><option value="active">active</option><option value="disabled">disabled</option></select><button type="submit" className="button-secondary" disabled={!canManage}>Save</button></form></td><td><form action={resetPasswordAction} className="inline-form"><input type="hidden" name="id" value={u.id} /><input type="password" name="new_password" placeholder="New password, min 10 chars" disabled={!canManage} /><button type="submit" className="button-secondary" disabled={!canManage}>Reset</button></form></td></tr>)}</tbody></DataTable>
      </SectionCard>

      <SectionCard title="Create user" description="Available only to users with users.manage permission.">
        {canManage ? <form action={createUserAction} className="stack-form"><div className="grid two"><label>Username<input name="username" required /></label><label>Display name<input name="display_name" /></label><label>Email<input name="email" type="email" /></label><label>Role<select name="role" defaultValue="viewer">{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></label><label>Initial password<input name="password" type="password" minLength={10} required /></label></div><button type="submit">Create user</button></form> : <ErrorState error="You do not have users.manage permission." />}
      </SectionCard>

      <SectionCard title="Safety model" description="What account management can and cannot do here.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Password hashes and secrets are never rendered on this page, only status pills.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Editing and password resets are gated by the users.manage permission and disabled otherwise.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">There is no user-deletion control — accounts can only be disabled, never removed, from this view.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">This RBAC scope is limited to the dashboard; Mother, Agent, and PHP Gateway credentials are untouched.</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={users.map((u) => ({ username: u.username, role: u.role, status: u.status }))} title="Sanitized users JSON" />
    </>
  );
}
