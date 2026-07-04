import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { mockAlerts } from "@/lib/mock-data";

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const openAlertCount = mockAlerts.filter(a => a.status === "open").length;

export function DashboardShell({ children, title, subtitle, actions }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar alertCount={openAlertCount} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} subtitle={subtitle} alertCount={openAlertCount} actions={actions} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
