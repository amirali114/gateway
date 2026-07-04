import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getPolicies } from "@/lib/adapters/dashboard-data";
import type { Policy } from "@/lib/contracts";
import { Shield, ShieldX, ShieldCheck, Clock, User, Hash, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function PolicySyncState({ policies }: { policies: Policy[] }) {
  const enabled = policies.filter(p => p.enabled).length;
  const disabled = policies.filter(p => !p.enabled).length;
  const denyCount = policies.filter(p => p.effect === "deny" && p.enabled).length;

  const mostRecentUpdate = policies.reduce((latest, p) => {
    return new Date(p.updatedAt) > new Date(latest) ? p.updatedAt : latest;
  }, policies[0]?.updatedAt ?? "");

  const syncAgeMin = mostRecentUpdate
    ? Math.round((Date.now() - new Date(mostRecentUpdate).getTime()) / 60000)
    : null;

  const syncFresh = syncAgeMin !== null && syncAgeMin < 60;

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 rounded-md border text-xs",
      syncFresh
        ? "bg-emerald-500/8 border-emerald-500/20"
        : "bg-slate-500/8 border-slate-500/20"
    )}>
      {syncFresh
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
      <div className="flex-1">
        <p className={cn("font-medium", syncFresh ? "text-emerald-400" : "text-amber-400")}>
          Policy sync state: {syncFresh ? "Synced" : "Sync may be stale"}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {enabled} policies active ({denyCount} deny rules) · {disabled} disabled ·
          Last policy change {syncAgeMin !== null ? `${syncAgeMin < 60 ? `${syncAgeMin}m ago` : `${Math.round(syncAgeMin / 60)}h ago`}` : "unknown"}
        </p>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        <RefreshCw className="w-3 h-3" />
        <span>Sync every 60s</span>
      </div>
    </div>
  );
}

function PolicyPostureBadge({ policies }: { policies: Policy[] }) {
  const activeDeny = policies.filter(p => p.effect === "deny" && p.enabled);
  const hasCritical = activeDeny.some(p => p.priority <= 5);
  const posture = hasCritical ? "Enforced" : activeDeny.length > 0 ? "Partial" : "Open";
  const cls = hasCritical
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : activeDeny.length > 0
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-red-400 bg-red-500/10 border-red-500/20";
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full border font-medium", cls)}>
      Posture: {posture}
    </span>
  );
}

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => { getPolicies().then(setPolicies); }, []);

  const enabled = policies.filter(p => p.enabled).length;

  return (
    <DashboardShell
      title="Policy"
      subtitle={`${policies.length} policies — ${enabled} active`}
      actions={policies.length > 0 ? <PolicyPostureBadge policies={policies} /> : undefined}
    >
      <div className="flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total policies", value: policies.length },
            { label: "Active", value: enabled },
            { label: "Deny rules", value: policies.filter(p => p.effect === "deny").length },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sync state */}
        {policies.length > 0 && <PolicySyncState policies={policies} />}

        {/* Policy list */}
        <div className="flex flex-col gap-3">
          {policies.sort((a, b) => a.priority - b.priority).map(policy => (
            <div key={policy.id} className={cn(
              "card-glass p-4 flex flex-col gap-3",
              !policy.enabled && "opacity-60",
              policy.effect === "deny" && policy.enabled && "border-red-500/15"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {policy.effect === "allow"
                    ? <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <ShieldX className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{policy.name}</p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium border",
                        policy.effect === "allow"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {policy.effect}
                      </span>
                      {!policy.enabled && (
                        <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">
                          disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
                    P{policy.priority}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Resource
                  </p>
                  <p className="font-mono text-primary">{policy.resource}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground mb-1">Conditions</p>
                  <div className="flex flex-col gap-0.5">
                    {policy.conditions.map((c, i) => (
                      <p key={i} className="font-mono text-[10px] text-foreground">{c}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-2">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{policy.createdBy}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated: {new Date(policy.updatedAt).toLocaleDateString("en-GB")}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Hash className="w-3 h-3" />{policy.id}
                </span>
              </div>

              <RawJsonDrawer data={policy} label={`Policy ${policy.id} (raw)`} />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
