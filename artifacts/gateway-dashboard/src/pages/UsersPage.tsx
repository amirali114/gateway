import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiGet, apiPost, apiPatch, read } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES, roleLabel } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { useState } from "react";

type User = {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  last_login_at?: string;
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);
  const [localOk, setLocalOk] = useState<string | null>(null);

  const canView = hasPermission("users.view");
  const canManage = hasPermission("users.manage");

  const { data: usersResult } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<{ ok: boolean; users: User[] }>("users"),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: (body: any): Promise<{ ok: boolean; error?: string }> => apiPost("users", body) as Promise<{ ok: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.ok) {
        setLocalOk("User created successfully");
        setLocalError(null);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        setLocalError(res.error ?? "Request failed");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }): Promise<{ ok: boolean; error?: string }> => apiPatch(`users/${encodeURIComponent(id)}`, body) as Promise<{ ok: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.ok) {
        setLocalOk("User updated successfully");
        setLocalError(null);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        setLocalError(res.error ?? "Request failed");
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }): Promise<{ ok: boolean; error?: string }> => apiPost(`users/${encodeURIComponent(id)}/reset-password`, { password }) as Promise<{ ok: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.ok) {
        setLocalOk("Password reset successfully");
        setLocalError(null);
      } else {
        setLocalError(res.error ?? "Request failed");
      }
    },
  });

  if (!canView) {
    return <ErrorState title="Access Denied" error="You do not have permission to view users." />;
  }

  const users = read(usersResult)?.users || [];
  const activeCount = users.filter((u) => u.status === "active").length;
  const disabledCount = users.length - activeCount;
  const roleCounts = ROLES.map((r) => ({ role: r, count: users.filter((u) => u.role === r).length })).filter((r) => r.count > 0);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate(Object.fromEntries(fd));
    e.currentTarget.reset();
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("id"));
    const body = {
      display_name: fd.get("display_name"),
      email: fd.get("email"),
      role: fd.get("role"),
      status: fd.get("status"),
    };
    updateMutation.mutate({ id, body });
  };

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("id"));
    const password = String(fd.get("new_password"));
    resetMutation.mutate({ id, password });
    e.currentTarget.reset();
  };

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

      {localError ? <ErrorState title="Operation failed" error={localError} /> : null}
      {localOk ? <div className="notice" style={{ padding: 12, background: "var(--success-bg, #e8f5e9)", color: "var(--success, #2e7d32)", marginBottom: 16, borderRadius: 6, border: "1px solid var(--success)" }}>{localOk}</div> : null}

      <SectionCard title="Users">
        <DataTable>
          <thead><tr><th>Username</th><th>Display name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Update</th><th>Password</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="mono">{u.username}</td>
                <td>{u.display_name}</td>
                <td className="mono">{u.email || "—"}</td>
                <td>{roleLabel(u.role)}</td>
                <td><StatusPill value={u.status} /></td>
                <td className="mono">{u.last_login_at || "—"}</td>
                <td>
                  <form onSubmit={handleUpdate} className="inline-form">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="display_name" defaultValue={u.display_name} placeholder="Display name" disabled={!canManage} />
                    <input name="email" defaultValue={u.email || ""} placeholder="email" disabled={!canManage} />
                    <select name="role" defaultValue={u.role} disabled={!canManage}>
                      {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                    <select name="status" defaultValue={u.status} disabled={!canManage}>
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                    <button type="submit" className="button-secondary" disabled={!canManage || updateMutation.isPending}>Save</button>
                  </form>
                </td>
                <td>
                  <form onSubmit={handleReset} className="inline-form">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="password" name="new_password" placeholder="New password, min 10 chars" disabled={!canManage} />
                    <button type="submit" className="button-secondary" disabled={!canManage || resetMutation.isPending}>Reset</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </SectionCard>

      <SectionCard title="Create user" description="Available only to users with users.manage permission.">
        {canManage ? (
          <form onSubmit={handleCreate} className="stack-form">
            <div className="grid two">
              <label>Username<input name="username" required /></label>
              <label>Display name<input name="display_name" /></label>
              <label>Email<input name="email" type="email" /></label>
              <label>Role<select name="role" defaultValue="viewer">{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></label>
              <label>Initial password<input name="password" type="password" minLength={10} required /></label>
            </div>
            <button type="submit" disabled={createMutation.isPending}>Create user</button>
          </form>
        ) : (
          <ErrorState error="You do not have users.manage permission." />
        )}
      </SectionCard>

      <SectionCard title="Safety model" description="What account management can and cannot do here.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Password hashes and secrets are never rendered on this page, only status pills.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Editing and password resets are gated by the users.manage permission and disabled otherwise.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">There is no user-deletion control — accounts can only be disabled, never removed, from this view.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">All dashboard user activity and management actions are recorded in the system audit trail.</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={usersResult} title="Raw users payload" />
    </>
  );
}
