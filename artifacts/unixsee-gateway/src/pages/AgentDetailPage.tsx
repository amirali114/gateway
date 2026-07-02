import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getAgent } from "@/lib/adapters/dashboard-data";
import type { Agent } from "@/lib/contracts";
import { MapPin, Clock, Activity, Zap, AlertTriangle, Globe, ArrowRight } from "lucide-react";

export default function AgentDetailPage() {
  const { agent_id } = useParams<{ agent_id: string }>();
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);

  useEffect(() => {
    if (agent_id) getAgent(agent_id).then(setAgent);
  }, [agent_id]);

  if (agent === undefined) return (
    <DashboardShell title="عامل" subtitle="در حال بارگذاری…">
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin ml-2" />
        در حال بارگذاری…
      </div>
    </DashboardShell>
  );

  if (!agent) return (
    <DashboardShell title="عامل یافت نشد">
      <div className="card-glass p-8 text-center text-muted-foreground">
        <p className="text-sm">عاملی با شناسه <span className="ltr font-mono">{agent_id}</span> یافت نشد.</p>
        <Link href="/agents">
          <a className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ArrowRight className="w-3.5 h-3.5" />
            بازگشت به فهرست عاملان
          </a>
        </Link>
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell
      title={agent.name}
      subtitle={`شناسه: ${agent.id}`}
      actions={<StatusPill status={agent.status} size="md" />}
    >
      <div className="flex flex-col gap-5 max-w-4xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/agents" className="hover:text-foreground transition-colors">عاملان</Link>
          <span>/</span>
          <span className="text-foreground">{agent.name}</span>
        </div>

        {/* Header card */}
        <div className="card-glass p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">{agent.name}</h2>
              <p className="ltr text-sm text-muted-foreground font-mono mt-0.5">{agent.id}</p>
            </div>
            <StatusPill status={agent.status} size="md" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: MapPin, label: "منطقه", value: agent.region, ltr: true },
              { icon: Clock, label: "آپ‌تایم", value: agent.uptime, ltr: true },
              { icon: Globe, label: "نسخه", value: agent.version, ltr: true },
              { icon: Clock, label: "آخرین فعالیت", value: new Date(agent.lastSeen).toLocaleString("fa-IR"), ltr: false },
            ].map(({ icon: Icon, label, value, ltr }) => (
              <div key={label} className="bg-muted/30 rounded p-3">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Icon className="w-3 h-3" />{label}
                </p>
                <p className={`text-sm font-semibold ${ltr ? "ltr" : ""}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {agent.tags.map(tag => (
              <span key={tag} className="ltr text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-glass p-4 text-center flex flex-col gap-1">
            <Activity className="w-5 h-5 mx-auto text-indigo-400" />
            <p className="text-2xl font-bold mt-1">{agent.requestsPerMin.toLocaleString("fa-IR")}</p>
            <p className="text-xs text-muted-foreground">درخواست در دقیقه</p>
          </div>
          <div className="card-glass p-4 text-center flex flex-col gap-1">
            <Zap className="w-5 h-5 mx-auto text-amber-400" />
            <p className="text-2xl font-bold mt-1 ltr">{agent.latencyMs}ms</p>
            <p className="text-xs text-muted-foreground">میانگین تأخیر</p>
          </div>
          <div className={`card-glass p-4 text-center flex flex-col gap-1 ${agent.errorRate > 1 ? "border-red-500/20" : ""}`}>
            <AlertTriangle className={`w-5 h-5 mx-auto ${agent.errorRate > 1 ? "text-red-400" : "text-emerald-400"}`} />
            <p className={`text-2xl font-bold mt-1 ltr ${agent.errorRate > 1 ? "text-red-400" : "text-emerald-400"}`}>
              {agent.errorRate}٪
            </p>
            <p className="text-xs text-muted-foreground">نرخ خطا</p>
          </div>
        </div>

        {/* Endpoint */}
        <div className="card-glass p-4 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">آدرس endpoint</p>
          <p className="ltr text-sm font-mono text-primary bg-muted/30 px-3 py-2 rounded-md break-all">{agent.endpoint}</p>
        </div>

        {/* Raw meta */}
        <div className="card-glass p-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">متادیتای فنی</p>
          <RawJsonDrawer data={agent.meta} label="متادیتای عامل" />
        </div>

        {/* Full agent object */}
        <RawJsonDrawer data={agent} label="آبجکت کامل عامل" />
      </div>
    </DashboardShell>
  );
}
