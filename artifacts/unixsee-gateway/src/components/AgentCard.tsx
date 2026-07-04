import type { Agent } from "@/lib/contracts";
import { StatusPill } from "./StatusPill";
import { RawJsonDrawer } from "./RawJsonDrawer";
import { Activity, Clock, MapPin, Zap, AlertTriangle, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface AgentCardProps {
  agent: Agent;
  showMeta?: boolean;
}

function getTelemetryFreshness(lastSeen: string): { label: string; className: string; stale: boolean } {
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 2) return { label: "Live", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", stale: false };
  if (diffMin < 10) return { label: `${Math.round(diffMin)}m ago`, className: "text-amber-400 bg-amber-500/10 border-amber-500/20", stale: false };
  if (diffMin < 60) return { label: `${Math.round(diffMin)}m ago`, className: "text-orange-400 bg-orange-500/10 border-orange-500/20", stale: true };
  const diffHr = Math.round(diffMin / 60);
  return { label: `${diffHr}h ago`, className: "text-red-400 bg-red-500/10 border-red-500/20", stale: true };
}

export function AgentCard({ agent, showMeta = false }: AgentCardProps) {
  const isUnhealthy = agent.status === "error" || agent.status === "degraded";
  const isOffline = agent.status === "offline";
  const freshness = getTelemetryFreshness(agent.lastSeen);

  return (
    <div className={cn(
      "card-glass p-4 flex flex-col gap-3 transition-colors",
      isUnhealthy && "border-red-500/20",
      isOffline && "opacity-70"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link href={`/agents/${agent.id}`} className="hover:text-primary transition-colors font-semibold text-sm truncate block">
            {agent.name}
          </Link>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">{agent.id}</p>
        </div>
        <StatusPill status={agent.status} />
      </div>

      {isOffline ? (
        <div className="flex items-center gap-2 bg-slate-500/8 border border-slate-500/20 rounded p-2.5 text-xs text-slate-400">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Agent unreachable — check connection or install status</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric icon={Activity} label="req/min" value={agent.requestsPerMin.toLocaleString()} />
          <Metric icon={Zap} label="latency (ms)" value={agent.latencyMs} />
          <Metric
            icon={AlertTriangle}
            label="error rate"
            value={`${agent.errorRate}%`}
            valueClass={agent.errorRate > 1 ? "text-red-400" : agent.errorRate > 0.5 ? "text-amber-400" : "text-emerald-400"}
          />
        </div>
      )}

      {/* Telemetry freshness + metadata row */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-2">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{agent.region}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{agent.uptime}</span>
        </span>
        <span className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded font-mono">{agent.version}</span>
        <span className={cn(
          "ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium",
          freshness.className
        )}>
          {freshness.stale && <RefreshCw className="w-2.5 h-2.5" />}
          {freshness.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.tags.map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/40">
            {tag}
          </span>
        ))}
      </div>

      {showMeta && <RawJsonDrawer data={agent.meta} label="Agent metadata" />}
    </div>
  );
}

function Metric({ icon: Icon, label, value, valueClass }: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/30 rounded p-2">
      <span className="text-muted-foreground text-[10px] flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </span>
      <span className={cn("font-semibold text-xs", valueClass)}>
        {value}
      </span>
    </div>
  );
}
