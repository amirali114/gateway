import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { auth, logout } = useAuth();
  const username = auth?.username;
  const role = auth?.role;
  const permissions = auth?.permissions || [];

  return (
    <div className="shell">
      <Sidebar permissions={permissions} username={username} role={role} onLogout={logout} />
      <div className="workspace">
        <Topbar userLabel={username ? `${username} · ${role}` : "auth-disabled"} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
