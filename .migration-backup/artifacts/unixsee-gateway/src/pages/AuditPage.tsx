import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getAuditLogs } from "@/lib/adapters/dashboard-data";
import type { AuditLog, AuditAction } from "@/lib/contracts";
import { Download, Globe, User } from "lucide-react";
import { cn } from "@/lib/utils";

const actionConfig: Record<AuditAction, { label: string; color: string }> = {
  create:        { label: "ایجاد",        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  update:        { label: "به‌روزرسانی", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  delete:        { label: "حذف",          color: "bg-red-500/10 text-red-400 border-red-500/20" },
  deploy:        { label: "استقرار",      color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  policy_change: { label: "تغییر سیاست", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  login:         { label: "ورود",         color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  logout:        { label: "خروج",         color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { getAuditLogs().then(setLogs); }, []);

  return (
    <DashboardShell
      title="گزارش حسابرسی"
      subtitle={`${logs.length} رویداد ثبت‌شده`}
      actions={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-xs rounded-md hover:bg-muted/80 transition-colors">
          <Download className="w-3.5 h-3.5" />
          خروجی CSV
        </button>
      }
    >
      <div className="flex flex-col gap-2.5 max-w-4xl">
        {logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => {
          const cfg = actionConfig[log.action];
          const isExpanded = expanded === log.id;
          const hasMeta = Object.keys(log.meta).length > 0;

          return (
            <div key={log.id} className="card-glass p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-muted-foreground w-20">
                  <span className="ltr">{new Date(log.timestamp).toLocaleDateString("fa-IR")}</span>
                  <span className="ltr">{new Date(log.timestamp).toLocaleTimeString("fa-IR")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-medium", cfg.color)}>{cfg.label}</span>
                    <p className="text-sm font-medium">{log.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.actor}
                      <span className="ltr text-[10px]">({log.actorEmail})</span>
                    </span>
                    <span className="ltr font-mono bg-muted/40 px-1.5 py-0.5 rounded">{log.resource}/{log.resourceId}</span>
                    <span className="flex items-center gap-1 ltr">
                      <Globe className="w-3 h-3" />{log.ipAddress}
                    </span>
                  </div>
                </div>
                {hasMeta && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    className="text-[11px] px-2 py-1 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                  >
                    {isExpanded ? "بستن" : "جزئیات"}
                  </button>
                )}
              </div>
              {isExpanded && hasMeta && (
                <RawJsonDrawer data={log.meta} label="متادیتای رویداد" defaultOpen />
              )}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
