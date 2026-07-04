import type { AgentStatus, AlertSeverity, ReleaseStage } from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: AgentStatus | AlertSeverity | ReleaseStage | "pass" | "warn" | "fail" | "skip" | "active" | "inactive" | "shadow" | "open" | "acknowledged" | "resolved" | "healthy" | "degraded" | "down" | "admin" | "operator" | "viewer" | "auditor" | "suspended" | "pending";
  size?: "sm" | "md";
  showDot?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active:       { label: "Active",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  idle:         { label: "Idle",          className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  error:        { label: "Error",         className: "bg-red-500/15 text-red-400 border-red-500/30" },
  degraded:     { label: "Degraded",      className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  offline:      { label: "Offline",       className: "bg-slate-600/15 text-slate-500 border-slate-600/30" },
  critical:     { label: "Critical",      className: "bg-red-500/20 text-red-400 border-red-500/40" },
  high:         { label: "High",          className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  medium:       { label: "Medium",        className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low:          { label: "Low",           className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  info:         { label: "Info",          className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  pending:      { label: "Pending",       className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  canary:       { label: "Canary",        className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  rolling:      { label: "Rolling",       className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  stable:       { label: "Stable",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rollback:     { label: "Rollback",      className: "bg-red-500/15 text-red-400 border-red-500/30" },
  pass:         { label: "Pass",          className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  warn:         { label: "Warn",          className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  fail:         { label: "Fail",          className: "bg-red-500/15 text-red-400 border-red-500/30" },
  skip:         { label: "Skip",          className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  inactive:     { label: "Inactive",      className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  shadow:       { label: "Shadow",        className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  open:         { label: "Open",          className: "bg-red-500/15 text-red-400 border-red-500/30" },
  acknowledged: { label: "Acknowledged",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  resolved:     { label: "Resolved",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  healthy:      { label: "Healthy",       className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  down:         { label: "Down",          className: "bg-red-500/15 text-red-400 border-red-500/30" },
  admin:        { label: "Admin",         className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  operator:     { label: "Operator",      className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  viewer:       { label: "Viewer",        className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  auditor:      { label: "Auditor",       className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  suspended:    { label: "Suspended",     className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export function StatusPill({ status, size = "sm", showDot = true }: StatusPillProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 border rounded-full font-medium",
      size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      config.className
    )}>
      {showDot && <span className={cn("status-dot", size === "sm" ? "w-[5px] h-[5px]" : "w-1.5 h-1.5")} style={{ background: "currentColor" }} />}
      {config.label}
    </span>
  );
}
