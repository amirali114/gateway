import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getMotherNodes } from "@/lib/adapters/dashboard-data";
import type { MotherNode } from "@/lib/contracts";
import { Network, Cpu, HardDrive, MemoryStick, Clock, MapPin, Bot, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function getStoragePosture(pct: number): { label: string; color: string; barColor: string } {
  if (pct >= 90) return { label: "Critical", color: "text-red-400", barColor: "bg-red-500" };
  if (pct >= 75) return { label: "Warning", color: "text-amber-400", barColor: "bg-amber-500" };
  return { label: "Healthy", color: "text-emerald-400", barColor: "bg-slate-400" };
}

function HeartbeatAge({ ts }: { ts: string }) {
  const secAgo = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  const ok = secAgo < 30;
  return (
    <span className={cn("text-[10px] font-mono", ok ? "text-emerald-400" : "text-amber-400")}>
      {secAgo < 60 ? `${secAgo}s ago` : `${Math.round(secAgo / 60)}m ago`}
    </span>
  );
}

export default function MotherPage() {
  const [nodes, setNodes] = useState<MotherNode[]>([]);

  useEffect(() => { getMotherNodes().then(setNodes); }, []);

  const primary = nodes.find(n => n.role.toLowerCase().includes("primary"));
  const allHealthy = nodes.every(n => n.status === "active" || n.status === "idle");
  const totalAgents = nodes.reduce((s, n) => s + n.connectedAgents, 0);

  return (
    <DashboardShell
      title="Mother Core"
      subtitle="Central controller network — agent orchestration and sync"
    >
      <div className="flex flex-col gap-4">

        {/* Core status banner */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-md border text-sm",
          allHealthy
            ? "bg-emerald-500/8 border-emerald-500/20"
            : "bg-amber-500/8 border-amber-500/20"
        )}>
          {allHealthy
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          <div>
            <p className={cn("font-semibold", allHealthy ? "text-emerald-400" : "text-amber-400")}>
              {allHealthy ? "Mother Core operational" : "Mother Core — attention required"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nodes.length} nodes active — {totalAgents} agents connected
              {primary && ` — primary: ${primary.name} (${primary.region})`}
            </p>
          </div>
          {primary && (
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Primary elected</span>
              <StatusPill status={primary.status} size="sm" />
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Mother nodes", value: nodes.length },
            { label: "Connected agents", value: totalAgents },
            { label: "Active nodes", value: nodes.filter(n => n.status === "active").length },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Node cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {nodes.map(node => {
            const storage = getStoragePosture(node.storagePercent);
            return (
              <div key={node.id} className={cn(
                "card-glass p-4 flex flex-col gap-4",
                node.status === "error" && "border-red-500/20"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-indigo-400" />
                      <p className="font-semibold text-sm">{node.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{node.role}</p>
                  </div>
                  <StatusPill status={node.status} />
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{node.region}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Bot className="w-3 h-3" />
                    <span>{node.connectedAgents} agents</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Sync lag: <span className="font-mono text-foreground">{node.syncLag}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Heartbeat: </span>
                    <HeartbeatAge ts={node.lastHeartbeat} />
                  </div>
                </div>

                {/* Resource meters */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground"><Cpu className="w-3 h-3" /> CPU</span>
                      <span className={cn("font-mono", node.cpuPercent > 80 ? "text-red-400" : node.cpuPercent > 60 ? "text-amber-400" : "text-foreground")}>
                        {node.cpuPercent}%
                      </span>
                    </div>
                    <ProgressBar value={node.cpuPercent} color={node.cpuPercent > 80 ? "bg-red-500" : node.cpuPercent > 60 ? "bg-amber-500" : "bg-emerald-500"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground"><MemoryStick className="w-3 h-3" /> Memory</span>
                      <span className={cn("font-mono", node.memPercent > 85 ? "text-red-400" : node.memPercent > 70 ? "text-amber-400" : "text-foreground")}>
                        {node.memPercent}%
                      </span>
                    </div>
                    <ProgressBar value={node.memPercent} color={node.memPercent > 85 ? "bg-red-500" : node.memPercent > 70 ? "bg-amber-500" : "bg-blue-500"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground"><HardDrive className="w-3 h-3" /> Storage</span>
                      <span className={cn("font-mono", storage.color)}>{node.storagePercent}%</span>
                    </div>
                    <ProgressBar value={node.storagePercent} color={storage.barColor} />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{100 - node.storagePercent}% free</span>
                      <span className={storage.color}>{storage.label}</span>
                    </div>
                  </div>
                </div>

                {/* Raw JSON */}
                <RawJsonDrawer data={node} label={`${node.name} raw data`} />
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
