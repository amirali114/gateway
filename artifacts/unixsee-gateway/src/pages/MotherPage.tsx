import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getMotherNodes } from "@/lib/adapters/dashboard-data";
import type { MotherNode } from "@/lib/contracts";
import { Network, Cpu, HardDrive, MemoryStick, Clock, MapPin, Bot } from "lucide-react";

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

export default function MotherPage() {
  const [nodes, setNodes] = useState<MotherNode[]>([]);

  useEffect(() => { getMotherNodes().then(setNodes); }, []);

  return (
    <DashboardShell title="نود‌های مادر" subtitle="کنترلرهای مرکزی شبکه عاملان">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "نودهای مادر", value: nodes.length },
            { label: "عاملان متصل", value: nodes.reduce((s, n) => s + n.connectedAgents, 0) },
            { label: "نود اصلی فعال", value: nodes.filter(n => n.status === "active").length },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
            <div key={node.id} className="card-glass p-4 flex flex-col gap-4">
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

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="ltr">{node.region}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Bot className="w-3 h-3" />
                  <span>{node.connectedAgents} عامل</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>تأخیر sync: <span className="ltr">{node.syncLag}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="ltr text-[10px]">{new Date(node.lastHeartbeat).toLocaleTimeString("fa-IR")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground"><Cpu className="w-3 h-3" /> CPU</span>
                    <span className="ltr font-mono">{node.cpuPercent}٪</span>
                  </div>
                  <ProgressBar value={node.cpuPercent} color={node.cpuPercent > 80 ? "bg-red-500" : node.cpuPercent > 60 ? "bg-amber-500" : "bg-emerald-500"} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground"><MemoryStick className="w-3 h-3" /> RAM</span>
                    <span className="ltr font-mono">{node.memPercent}٪</span>
                  </div>
                  <ProgressBar value={node.memPercent} color={node.memPercent > 85 ? "bg-red-500" : node.memPercent > 70 ? "bg-amber-500" : "bg-blue-500"} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground"><HardDrive className="w-3 h-3" /> ذخیره‌سازی</span>
                    <span className="ltr font-mono">{node.storagePercent}٪</span>
                  </div>
                  <ProgressBar value={node.storagePercent} color="bg-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
