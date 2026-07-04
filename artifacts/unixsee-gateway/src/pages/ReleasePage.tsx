import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { ReleaseGatePanel } from "@/components/ReleaseGatePanel";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getActiveRelease } from "@/lib/adapters/dashboard-data";
import type { ReleaseGate } from "@/lib/contracts";
import { GitBranch, Clock, ShieldCheck, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const PAST_RELEASES: Array<{ id: string; name: string; version: string; stage: ReleaseGate["stage"]; date: string; by: string }> = [
  { id: "rel-2026-06-28", name: "inference-worker v2.4.1", version: "v2.4.1", stage: "stable", date: "2026-06-28", by: "ali.hosseini@unixsee.io" },
  { id: "rel-2026-06-14", name: "guardrail-validator v3.1.0", version: "v3.1.0", stage: "stable", date: "2026-06-14", by: "sara.ahmadi@unixsee.io" },
  { id: "rel-2026-05-30", name: "router-gateway-main v1.9.3", version: "v1.9.3", stage: "stable", date: "2026-05-30", by: "ali.hosseini@unixsee.io" },
  { id: "rel-2026-05-10", name: "model-manager v2.3.7", version: "v2.3.7", stage: "rollback", date: "2026-05-10", by: "reza.moradi@unixsee.io" },
];

function GatePostureSummary({ release }: { release: ReleaseGate }) {
  const passed = release.gates.filter(g => g.passed).length;
  const total = release.gates.length;
  const blocked = passed < total;
  const remaining = total - passed;

  return (
    <div className={cn(
      "card-glass p-4 flex items-start gap-4 border",
      blocked ? "border-amber-500/20" : "border-emerald-500/20"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        blocked ? "bg-amber-500/15" : "bg-emerald-500/15"
      )}>
        {blocked
          ? <ShieldAlert className="w-5 h-5 text-amber-400" />
          : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold text-sm", blocked ? "text-amber-400" : "text-emerald-400")}>
          {blocked
            ? `Release gate blocked — ${remaining} gate${remaining > 1 ? "s" : ""} pending`
            : "All release gates cleared"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {passed}/{total} quality gates passed — stage: <span className="font-mono">{release.stage}</span>
        </p>
        {blocked && (
          <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Rollout is paused at {release.progressPercent}% until all gates clear. Review gate status and canary metrics below.
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-2xl font-bold">{release.progressPercent}%</span>
        <span className="text-[10px] text-muted-foreground">rollout</span>
      </div>
    </div>
  );
}

export default function ReleasePage() {
  const [release, setRelease] = useState<ReleaseGate | null>(null);

  useEffect(() => { getActiveRelease().then(setRelease); }, []);

  return (
    <DashboardShell title="Release" subtitle="Canary rollout status and gate posture">
      <div className="flex flex-col gap-5 max-w-4xl">

        {/* Active release */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Active release
          </h2>
          {release ? (
            <div className="flex flex-col gap-3">
              <GatePostureSummary release={release} />
              <ReleaseGatePanel release={release} />
              <RawJsonDrawer data={release} label="Release object (raw)" />
            </div>
          ) : (
            <div className="card-glass p-8 text-center text-muted-foreground text-sm">
              No active release in progress
            </div>
          )}
        </div>

        {/* History */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Release history</h2>
          <div className="card-glass overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Version</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">By</th>
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
                    <td className="px-4 py-3 font-mono text-primary">{r.version}</td>
                    <td className="px-4 py-3"><StatusPill status={r.stage} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.date}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{r.by}</td>
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
