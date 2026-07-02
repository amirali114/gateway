import type { AgentStatus, AlertSeverity, ReleaseStage } from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: AgentStatus | AlertSeverity | ReleaseStage | "pass" | "warn" | "fail" | "skip" | "active" | "inactive" | "shadow" | "open" | "acknowledged" | "resolved" | "healthy" | "degraded" | "down" | "admin" | "operator" | "viewer" | "auditor" | "suspended" | "pending";
  size?: "sm" | "md";
  showDot?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active:       { label: "فعال",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  idle:         { label: "بیکار",       className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  error:        { label: "خطا",         className: "bg-red-500/15 text-red-400 border-red-500/30" },
  degraded:     { label: "کاهش‌یافته",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  offline:      { label: "آفلاین",      className: "bg-slate-600/15 text-slate-500 border-slate-600/30" },
  critical:     { label: "بحرانی",      className: "bg-red-500/20 text-red-400 border-red-500/40" },
  high:         { label: "بالا",        className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  medium:       { label: "متوسط",       className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low:          { label: "پایین",       className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  info:         { label: "اطلاعات",     className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  pending:      { label: "در انتظار",   className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  canary:       { label: "کاناری",      className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  rolling:      { label: "تدریجی",      className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  stable:       { label: "پایدار",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rollback:     { label: "بازگشت",      className: "bg-red-500/15 text-red-400 border-red-500/30" },
  pass:         { label: "سالم",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  warn:         { label: "هشدار",       className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  fail:         { label: "خطا",         className: "bg-red-500/15 text-red-400 border-red-500/30" },
  skip:         { label: "نادیده",      className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  inactive:     { label: "غیرفعال",     className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  shadow:       { label: "سایه",        className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  open:         { label: "باز",         className: "bg-red-500/15 text-red-400 border-red-500/30" },
  acknowledged: { label: "تأییدشده",    className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  resolved:     { label: "حل‌شده",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  healthy:      { label: "سالم",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  down:         { label: "خاموش",       className: "bg-red-500/15 text-red-400 border-red-500/30" },
  admin:        { label: "مدیر",        className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  operator:     { label: "اپراتور",     className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  viewer:       { label: "مشاهده‌گر",   className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  auditor:      { label: "حسابرس",      className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  suspended:    { label: "تعلیق",       className: "bg-red-500/15 text-red-400 border-red-500/30" },
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
