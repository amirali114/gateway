import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getDiagnostics } from "@/lib/adapters/dashboard-data";
import type { DiagnosticCheck } from "@/lib/contracts";
import { CheckCircle2, XCircle, AlertCircle, SkipForward, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  pass: CheckCircle2,
  warn: AlertCircle,
  fail: XCircle,
  skip: SkipForward,
};
const iconColors = {
  pass: "text-emerald-400",
  warn: "text-amber-400",
  fail: "text-red-400",
  skip: "text-slate-500",
};

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => { getDiagnostics().then(setChecks); }, []);

  const runDiagnostics = () => {
    setRunning(true);
    setTimeout(() => { getDiagnostics().then(setChecks); setRunning(false); }, 1200);
  };

  const counts = {
    pass: checks.filter(c => c.status === "pass").length,
    warn: checks.filter(c => c.status === "warn").length,
    fail: checks.filter(c => c.status === "fail").length,
    skip: checks.filter(c => c.status === "skip").length,
  };

  const overall = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";

  return (
    <DashboardShell
      title="تشخیص سیستم"
      subtitle="بررسی سلامت تمام اجزای سیستم"
      actions={
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", running && "animate-spin")} />
          {running ? "در حال اجرا…" : "اجرای مجدد"}
        </button>
      }
    >
      <div className="flex flex-col gap-4 max-w-3xl">

        {/* Summary */}
        <div className={cn(
          "card-glass p-4 flex items-center gap-4",
          overall === "fail" && "border-red-500/30",
          overall === "warn" && "border-amber-500/30",
          overall === "pass" && "border-emerald-500/20",
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            overall === "fail" ? "bg-red-500/20" : overall === "warn" ? "bg-amber-500/20" : "bg-emerald-500/20"
          )}>
            {overall === "pass" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
             overall === "warn" ? <AlertCircle className="w-5 h-5 text-amber-400" /> :
             <XCircle className="w-5 h-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {overall === "pass" ? "تمام سیستم‌ها سالم هستند" :
               overall === "warn" ? "برخی هشدارها نیاز به توجه دارند" :
               "خرابی‌هایی در سیستم وجود دارد"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.pass} سالم، {counts.warn} هشدار، {counts.fail} خطا
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            {[
              { key: "pass", label: "سالم", color: "text-emerald-400" },
              { key: "warn", label: "هشدار", color: "text-amber-400" },
              { key: "fail", label: "خطا", color: "text-red-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="text-center">
                <p className={cn("text-lg font-bold", color)}>{counts[key as keyof typeof counts]}</p>
                <p className="text-muted-foreground text-[10px]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Checks list */}
        <div className="card-glass overflow-hidden">
          {checks.map((check, i) => {
            const Icon = icons[check.status];
            return (
              <div key={check.id} className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors",
                i !== checks.length - 1 && "border-b border-border/50"
              )}>
                <Icon className={cn("w-4 h-4 shrink-0", iconColors[check.status])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{check.name}</p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    check.status === "fail" ? "text-red-400" :
                    check.status === "warn" ? "text-amber-400" : "text-muted-foreground"
                  )}>{check.message}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {check.latencyMs !== undefined && (
                    <span className="ltr text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{check.latencyMs}ms
                    </span>
                  )}
                  <span className="ltr text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{check.component}</span>
                  <StatusPill status={check.status} showDot={false} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
