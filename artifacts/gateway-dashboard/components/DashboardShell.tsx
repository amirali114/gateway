import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({ permissions, username, role, children }: { permissions: readonly string[]; username?: string; role?: string; children: ReactNode }) {
  return (
    <div className="shell">
      <Sidebar permissions={permissions} username={username} role={role} />
      <div className="workspace">
        <Topbar userLabel={username ? `${username} · ${role}` : "auth-disabled"} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
