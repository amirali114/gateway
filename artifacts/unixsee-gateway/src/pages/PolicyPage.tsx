import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getPolicies } from "@/lib/adapters/dashboard-data";
import type { Policy } from "@/lib/contracts";
import { Shield, ShieldX, ShieldCheck, Clock, User, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => { getPolicies().then(setPolicies); }, []);

  const enabled = policies.filter(p => p.enabled).length;

  return (
    <DashboardShell
      title="مدیریت سیاست‌ها"
      subtitle={`${policies.length} سیاست — ${enabled} فعال`}
    >
      <div className="flex flex-col gap-4">

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "کل سیاست‌ها", value: policies.length },
            { label: "فعال", value: enabled },
            { label: "سیاست‌های deny", value: policies.filter(p => p.effect === "deny").length },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

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
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{policy.name}</p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium border",
                        policy.effect === "allow" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {policy.effect === "allow" ? "مجاز" : "رد"}
                      </span>
                      {!policy.enabled && <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">غیرفعال</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="ltr text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">P{policy.priority}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> منبع
                  </p>
                  <p className="ltr font-mono text-primary">{policy.resource}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground mb-1">شرایط</p>
                  <div className="flex flex-col gap-0.5">
                    {policy.conditions.map((c, i) => (
                      <p key={i} className="ltr font-mono text-[10px] text-foreground">{c}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-border pt-2">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{policy.createdBy}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />به‌روز: <span className="ltr">{new Date(policy.updatedAt).toLocaleDateString("fa-IR")}</span></span>
                <span className="ltr flex items-center gap-1 mr-auto">
                  <Hash className="w-3 h-3" />{policy.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
