import { DashboardShell } from "../../components/DashboardShell";
import { requireDashboardAuth } from "../../lib/auth";
import { roleLabel } from "../../lib/rbac";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = await requireDashboardAuth();
  return <DashboardShell permissions={auth.permissions} username={auth.display_name || auth.username} role={roleLabel(String(auth.role))}>{children}</DashboardShell>;
}
