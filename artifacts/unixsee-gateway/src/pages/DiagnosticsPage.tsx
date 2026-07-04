import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getDiagnostics, getAlerts } from "@/lib/adapters/dashboard-data";
import type { DiagnosticCheck, Alert } from "@/lib/contracts";
import {
  CheckCircle2, XCircle, AlertCircle, SkipForward, Clock,
  RefreshCw, ShieldCheck, ShieldAlert, Bell, ChevronDown, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const checkIcons = {
  pass: CheckCircle2,
  warn: AlertCircle,
  fail: XCircle,
  skip: SkipForward,
};
const checkColors = {
  pass: "text-emerald-400",
  warn: "text-amber-400",
  fail: "text-red-400",
  skip: "text-slate-500",
};

const alertSeverityOrder = ["critical", "high", "medium", "low", "info"];
const alertSevColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  info: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function AlertPosturePanel({ alerts }: { alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(false);
  const open = alerts.filter(a => a.status === "open");
  const critical = open.filter(a => a.severity === "critical").length;
  const high = open.filter(a => a.severity === "high").length;
  const overall = critical > 0 ? "critical" : high > 0 ? "high" : open.length > 0 ? "medium" : "pass";

  const postureLabel = overall === "pass" ? "No active alerts" : `${open.length} open alert${open.length > 1 ? "s" : ""}`;
  const postureColor = overall === "pass" ? "text-emerald-400" : overall === "critical" ? "text-red-400" : "text-amber-400";
  const borderColor = overall === "pass" ? "border-emerald-500/20" : overall === "critical" ? "border-red-500/20" : "border-amber-500/20";

  return (
    <div className={cn("card-glass border overflow-hidden", borderColor)}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <Bell className={cn("w-4 h-4 shrink-0", postureColor)} />
        <div className="flex-1 text-left">
          <p className={cn("text-sm font-semibold", postureColor)}>Alert posture: {postureLabel}</p>
          <p className="text-xs text-muted-foreground">
            {critical > 0 && `${critical} critical · `}
            {high > 0 && `${high} high · `}
            {open.length} open total · {alerts.filter(a => a.status === "acknowledged").length} acknowledged
          </p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {alertSeverityOrder.map(sev => {
            const sevAlerts = open.filter(a => a.severity === sev);
            if (sevAlerts.length === 0) return null;
            return (
              <div key={sev} className="px-4 py-2 border-b border-border/50 last:border-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">{sev}</p>
                <div className="flex flex-col gap-1.5">
                  {sevAlerts.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 mt-0.5", alertSevColors[a.severity])}>
                        {a.severity}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{a.title}</p>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{a.message}</p>
                      </div>
                      <span className="ml-auto shrink-0"><StatusPill status={a.status} /></span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {open.length === 0 && (
            <div className="px-4 py-3 text-xs text-muted-foreground">No open alerts</div>
          )}
          <div className="px-4 py-2 border-t border-border">
            <RawJsonDrawer data={alerts} label="All alerts (raw)" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date>(new Date());

  useEffect(() => {
    getDiagnostics().then(setChecks);
    getAlerts().then(setAlerts);
  }, []);

  const runDiagnostics = () => {
    setRunning(true);
    setTimeout(() => {
      getDiagnostics().then(setChecks);
      getAlerts().then(setAlerts);
      setLastRun(new Date());
      setRunning(false);
    }, 1200);
  };

  const counts = {
    pass: checks.filter(c => c.status === "pass").length,
    warn: checks.filter(c => c.status === "warn").length,
    fail: checks.filter(c => c.status === "fail").length,
    skip: checks.filter(c => c.status === "skip").length,
  };

  const overall = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";

  const componentGroups = checks.reduce<Record<string, DiagnosticCheck[]>>((acc, c) => {
    if (!acc[c.component]) acc[c.component] = [];
    acc[c.component].push(c);
    return acc;
  }, {});

  return (
    <DashboardShell
      title="Diagnostics"
      subtitle="System health checks and alert posture"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Last run: {lastRun.toLocaleTimeString("en-GB")}
          </span>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", running && "animate-spin")} />
            {running ? "Running…" : "Re-run checks"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 max-w-3xl">

        {/* Posture summary */}
        <div className={cn(
          "card-glass p-4 flex items-center gap-4 border",
          overall === "fail" ? "border-red-500/30" : overall === "warn" ? "border-amber-500/30" : "border-emerald-500/20",
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            overall === "fail" ? "bg-red-500/20" : overall === "warn" ? "bg-amber-500/20" : "bg-emerald-500/20"
          )}>
            {overall === "pass"
              ? <ShieldCheck className="w-5 h-5 text-emerald-400" />
              : overall === "warn"
                ? <ShieldAlert className="w-5 h-5 text-amber-400" />
                : <XCircle className="w-5 h-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {overall === "pass" ? "All systems healthy" :
               overall === "warn" ? "Some checks require attention" :
               "System failures detected"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.pass} passed, {counts.warn} warnings, {counts.fail} failed
              {counts.skip > 0 && `, ${counts.skip} skipped`}
            </p>
          </div>
          <div className="flex gap-4 text-xs shrink-0">
            {[
              { key: "pass", label: "Pass", color: "text-emerald-400" },
              { key: "warn", label: "Warn", color: "text-amber-400" },
              { key: "fail", label: "Fail", color: "text-red-400" },
            ].map(({ key, label, color }) => (
              <div key={key} className="text-center">
                <p className={cn("text-lg font-bold", color)}>{counts[key as keyof typeof counts]}</p>
                <p className="text-muted-foreground text-[10px]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alert posture */}
        <AlertPosturePanel alerts={alerts} />

        {/* Checks by component */}
        <div className="flex flex-col gap-3">
          {Object.entries(componentGroups).map(([component, componentChecks]) => {
            const hasIssue = componentChecks.some(c => c.status === "fail" || c.status === "warn");
            return (
              <div key={component} className="card-glass overflow-hidden">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20",
                  hasIssue ? "text-amber-400" : "text-muted-foreground"
                )}>
                  <span className="text-[10px] font-mono font-medium uppercase">{component}</span>
                  {hasIssue && <AlertCircle className="w-3 h-3" />}
                </div>
                {componentChecks.map((check, i) => {
                  const Icon = checkIcons[check.status];
                  return (
                    <div key={check.id} className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors",
                      i !== componentChecks.length - 1 && "border-b border-border/50"
                    )}>
                      <Icon className={cn("w-4 h-4 shrink-0", checkColors[check.status])} />
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
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{check.latencyMs}ms
                          </span>
                        )}
                        <StatusPill status={check.status} showDot={false} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Raw checks */}
        <RawJsonDrawer data={checks} label="All diagnostic checks (raw)" />
      </div>
    </DashboardShell>
  );
}
