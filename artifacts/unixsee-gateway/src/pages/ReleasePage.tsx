import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { ReleaseGatePanel } from "@/components/ReleaseGatePanel";
import { StatusPill } from "@/components/StatusPill";
import { getActiveRelease } from "@/lib/adapters/dashboard-data";
import type { ReleaseGate } from "@/lib/contracts";
import { GitBranch, Clock, RotateCcw, Play, Pause } from "lucide-react";

const PAST_RELEASES: Array<{ id: string; name: string; version: string; stage: ReleaseGate["stage"]; date: string; by: string }> = [
  { id: "rel-2025-06-28", name: "inference-worker v2.4.1", version: "v2.4.1", stage: "stable", date: "۱۴۰۴/۰۴/۰۷", by: "ali.hosseini@unixsee.io" },
  { id: "rel-2025-06-14", name: "guardrail-validator v3.1.0", version: "v3.1.0", stage: "stable", date: "۱۴۰۴/۰۳/۲۴", by: "sara.ahmadi@unixsee.io" },
  { id: "rel-2025-05-30", name: "router-gateway-main v1.9.3", version: "v1.9.3", stage: "stable", date: "۱۴۰۴/۰۳/۰۹", by: "ali.hosseini@unixsee.io" },
  { id: "rel-2025-05-10", name: "model-manager v2.3.7", version: "v2.3.7", stage: "rollback", date: "۱۴۰۴/۰۲/۲۰", by: "reza.moradi@unixsee.io" },
];

export default function ReleasePage() {
  const [release, setRelease] = useState<ReleaseGate | null>(null);

  useEffect(() => { getActiveRelease().then(setRelease); }, []);

  return (
    <DashboardShell title="مدیریت انتشار" subtitle="کنترل استقرار و Canary Rollout">
      <div className="flex flex-col gap-5 max-w-4xl">

        {/* Active release */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            انتشار جاری
          </h2>
          {release ? (
            <div className="flex flex-col gap-3">
              <ReleaseGatePanel release={release} />
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors">
                  <Play className="w-3.5 h-3.5" />
                  ادامه استقرار
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-muted border border-border text-xs rounded-md hover:bg-muted/80 transition-colors">
                  <Pause className="w-3.5 h-3.5" />
                  توقف موقت
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md hover:bg-red-500/20 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Rollback
                </button>
              </div>
            </div>
          ) : (
            <div className="card-glass p-8 text-center text-muted-foreground text-sm">
              هیچ انتشار فعالی وجود ندارد
            </div>
          )}
        </div>

        {/* History */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">تاریخچه انتشارها</h2>
          <div className="card-glass overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">نام</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">نسخه</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">وضعیت</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">تاریخ</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">توسط</th>
                </tr>
              </thead>
              <tbody>
                {PAST_RELEASES.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 ltr font-mono text-primary">{r.version}</td>
                    <td className="px-4 py-3"><StatusPill status={r.stage} /></td>
                    <td className="px-4 py-3 ltr">{r.date}</td>
                    <td className="px-4 py-3 ltr text-muted-foreground">{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
