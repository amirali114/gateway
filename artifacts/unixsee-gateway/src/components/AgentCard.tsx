import type { Agent } from "@/lib/contracts";
import { StatusPill } from "./StatusPill";
import { RawJsonDrawer } from "./RawJsonDrawer";
import { Activity, Clock, MapPin, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface AgentCardProps {
  agent: Agent;
  showMeta?: boolean;
}

export function AgentCard({ agent, showMeta = false }: AgentCardProps) {
  const isUnhealthy = agent.status === "error" || agent.status === "degraded";

  return (
    <div className={cn(
      "card-glass p-4 flex flex-col gap-3 transition-colors",
      isUnhealthy && "border-red-500/20"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/agents/${agent.id}`} className="hover:text-primary transition-colors font-semibold text-sm truncate block">
            {agent.name}
          </Link>
          <p className="ltr text-[11px] text-muted-foreground mt-0.5 truncate">{agent.id}</p>
        </div>
        <StatusPill status={agent.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Metric icon={Activity} label="درخواست/دقیقه" value={agent.requestsPerMin.toLocaleString("fa-IR")} />
        <Metric icon={Zap} label="تأخیر (ms)" value={agent.latencyMs} ltr />
        <Metric
          icon={AlertTriangle}
          label="نرخ خطا"
          value={`${agent.errorRate}٪`}
          valueClass={agent.errorRate > 1 ? "text-red-400" : agent.errorRate > 0.5 ? "text-amber-400" : "text-emerald-400"}
          ltr
        />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-2">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="ltr">{agent.region}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className="ltr">{agent.uptime}</span>
        </span>
        <span className="ltr text-[11px] bg-muted/60 px-1.5 py-0.5 rounded font-mono">{agent.version}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.tags.map(tag => (
          <span key={tag} className="ltr text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/40">
            {tag}
          </span>
        ))}
      </div>

      {showMeta && <RawJsonDrawer data={agent.meta} label="متادیتای عامل" />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, valueClass, ltr: isLtr }: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  valueClass?: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/30 rounded p-2">
      <span className="text-muted-foreground text-[10px] flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </span>
      <span className={cn("font-semibold text-xs", isLtr && "ltr", valueClass)}>
        {value}
      </span>
    </div>
  );
}
