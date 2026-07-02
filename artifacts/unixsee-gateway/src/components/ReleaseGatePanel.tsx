import type { ReleaseGate } from "@/lib/contracts";
import { StatusPill } from "./StatusPill";
import { Check, X, Loader2, GitBranch, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseGatePanelProps {
  release: ReleaseGate;
  compact?: boolean;
}

export function ReleaseGatePanel({ release, compact = false }: ReleaseGatePanelProps) {
  return (
    <div className="card-glass p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <p className="font-semibold text-sm">{release.name}</p>
            <span className="ltr text-[11px] font-mono text-muted-foreground">{release.version}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{release.notes}</p>
        </div>
        <StatusPill status={release.stage} size="md" />
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">پیشرفت استقرار</span>
          <span className="font-semibold ltr">{release.progressPercent}٪</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              release.stage === "canary" ? "bg-purple-500" :
              release.stage === "rolling" ? "bg-blue-500" :
              release.stage === "stable" ? "bg-emerald-500" : "bg-red-500"
            )}
            style={{ width: `${release.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Gates */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">دروازه‌های کیفیت</p>
        <div className={cn("grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-3")}>
          {release.gates.map(gate => (
            <div key={gate.name} className={cn(
              "flex items-center gap-1.5 rounded p-1.5 text-xs border",
              gate.passed
                ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                : "bg-slate-500/8 border-border text-muted-foreground"
            )}>
              {gate.passed
                ? <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                : <X className="w-3 h-3 text-muted-foreground shrink-0" />
              }
              <span className="truncate text-[11px]">{gate.label}</span>
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <>
          {/* Canary metrics */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">متریک‌های کاناری</p>
            <div className="grid grid-cols-3 gap-2">
              <CanaryMetric
                label="نرخ موفقیت"
                value={`${release.canaryMetrics.successRate}٪`}
                good={release.canaryMetrics.successRate >= 99}
              />
              <CanaryMetric
                label="نرخ خطا"
                value={`${release.canaryMetrics.errorRate}٪`}
                good={release.canaryMetrics.errorRate < 1}
                ltr
              />
              <CanaryMetric
                label="تأخیر P99"
                value={`${release.canaryMetrics.latencyP99}ms`}
                good={release.canaryMetrics.latencyP99 < 100}
                ltr
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-2">
            {release.approvedBy && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="ltr">{release.approvedBy}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              شروع: <span className="ltr">{new Date(release.startedAt).toLocaleString("fa-IR")}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function CanaryMetric({ label, value, good, ltr: isLtr }: { label: string; value: string; good: boolean; ltr?: boolean }) {
  return (
    <div className="bg-muted/30 rounded p-2 flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", isLtr && "ltr", good ? "text-emerald-400" : "text-amber-400")}>
        {value}
      </span>
    </div>
  );
}
