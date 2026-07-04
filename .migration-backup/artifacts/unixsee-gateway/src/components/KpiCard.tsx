import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  highlight?: "default" | "success" | "warning" | "error";
}

const highlightConfig = {
  default:  { border: "border-border", icon: "text-indigo-400 bg-indigo-500/10" },
  success:  { border: "border-emerald-500/20", icon: "text-emerald-400 bg-emerald-500/10" },
  warning:  { border: "border-amber-500/20", icon: "text-amber-400 bg-amber-500/10" },
  error:    { border: "border-red-500/20", icon: "text-red-400 bg-red-500/10" },
};

export function KpiCard({ label, value, unit, sub, icon: Icon, trend, trendValue, highlight = "default" }: KpiCardProps) {
  const cfg = highlightConfig[highlight];
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "metric-up" : trend === "down" ? "metric-down" : "text-muted-foreground";

  return (
    <div className={cn("card-glass p-4 flex flex-col gap-3 transition-colors hover:border-border/60", cfg.border)}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground leading-tight">{label}</span>
        <div className={cn("p-1.5 rounded-md", cfg.icon)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {(trendValue || sub) && (
        <div className="flex items-center gap-1.5 text-xs">
          {trendValue && trend && (
            <>
              <TrendIcon className={cn("w-3 h-3", trendColor)} />
              <span className={trendColor}>{trendValue}</span>
            </>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  );
}
