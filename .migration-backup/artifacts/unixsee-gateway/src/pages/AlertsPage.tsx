import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getAlerts } from "@/lib/adapters/dashboard-data";
import type { Alert, AlertSeverity } from "@/lib/contracts";
import { Bell, Clock, User, Filter, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const severityOrder: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "acknowledged" | "resolved">("all");

  useEffect(() => { getAlerts().then(setAlerts); }, []);

  const sorted = [...alerts].sort((a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );
  const filtered = filterStatus === "all" ? sorted : sorted.filter(a => a.status === filterStatus);

  const counts = {
    open: alerts.filter(a => a.status === "open").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    resolved: alerts.filter(a => a.status === "resolved").length,
    critical: alerts.filter(a => a.severity === "critical").length,
  };

  return (
    <DashboardShell title="هشدارها" subtitle={`${counts.open} باز، ${counts.acknowledged} تأییدشده، ${counts.resolved} حل‌شده`}>
      <div className="flex flex-col gap-4">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "باز", value: counts.open, color: "text-red-400" },
            { label: "تأییدشده", value: counts.acknowledged, color: "text-amber-400" },
            { label: "حل‌شده", value: counts.resolved, color: "text-emerald-400" },
            { label: "بحرانی", value: counts.critical, color: "text-red-500 font-extrabold" },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {(["all", "open", "acknowledged", "resolved"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border transition-colors",
                filterStatus === f ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {f === "all" ? "همه" : f === "open" ? "باز" : f === "acknowledged" ? "تأییدشده" : "حل‌شده"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map(alert => (
            <div key={alert.id} className={cn(
              "card-glass p-4 flex flex-col gap-3",
              alert.severity === "critical" && alert.status === "open" && "border-red-500/30",
              alert.severity === "high" && alert.status === "open" && "border-orange-500/20",
            )}>
              <div className="flex items-start gap-3">
                <StatusPill status={alert.severity} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={alert.status} showDot={false} />
                  {alert.status === "open" && (
                    <button className="text-[11px] px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" />
                      تأیید
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-2">
                <span className="ltr font-mono bg-muted/40 px-1.5 py-0.5 rounded">{alert.source}</span>
                {alert.agentId && <span className="ltr text-muted-foreground">{alert.agentId}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="ltr">{new Date(alert.createdAt).toLocaleString("fa-IR")}</span>
                </span>
                {alert.acknowledgedBy && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span className="ltr">{alert.acknowledgedBy}</span>
                  </span>
                )}
                <span className="ltr text-[10px] text-muted-foreground/60 mr-auto">{alert.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
