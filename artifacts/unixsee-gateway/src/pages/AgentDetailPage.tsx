import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { getAgent } from "@/lib/adapters/dashboard-data";
import type { Agent } from "@/lib/contracts";
import {
  MapPin, Clock, Activity, Zap, AlertTriangle, Globe,
  ArrowLeft, WifiOff, RefreshCw, Terminal, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

function getTelemetryFreshness(lastSeen: string) {
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 2) return { label: "Live — telemetry current", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", stale: false };
  if (diffMin < 10) return { label: `Telemetry ${Math.round(diffMin)}m old`, className: "text-amber-400 bg-amber-500/10 border-amber-500/20", stale: false };
  if (diffMin < 60) return { label: `Telemetry stale (${Math.round(diffMin)}m)`, className: "text-orange-400 bg-orange-500/10 border-orange-500/20", stale: true };
  return { label: `Telemetry very stale (${Math.round(diffMin / 60)}h)`, className: "text-red-400 bg-red-500/10 border-red-500/20", stale: true };
}

function UnavailablePanel({ agent }: { agent: Agent }) {
  const isError = agent.status === "error";
  const isOffline = agent.status === "offline";

  const lastErrorMsg = typeof agent.meta?.lastError === "string"
    ? agent.meta.lastError
    : null;

  return (
    <div className={cn(
      "card-glass p-5 flex flex-col gap-4 border",
      isError ? "border-red-500/25" : "border-slate-500/20"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isError ? "bg-red-500/15" : "bg-slate-500/15"
        )}>
          {isOffline
            ? <WifiOff className="w-5 h-5 text-slate-400" />
            : <AlertTriangle className="w-5 h-5 text-red-400" />}
        </div>
        <div>
          <p className={cn("font-semibold text-sm", isError ? "text-red-400" : "text-slate-400")}>
            {isError ? "Agent in error state" : "Agent unreachable"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isError
              ? "This agent has reported a fatal error. Metrics and telemetry may be incomplete or unavailable."
              : "This agent is not responding to heartbeat checks. It may be stopped, network-partitioned, or uninstalled."}
          </p>
          {lastErrorMsg && (
            <div className="mt-2 font-mono text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 rounded px-3 py-2">
              {lastErrorMsg}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-3 flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Recovery steps</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {isError ? (
            <>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">1.</span> Check host system logs for OOM or process signals</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">2.</span> Verify resource limits (memory, CPU) on the host</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">3.</span> Restart the agent process after resolving the underlying cause</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">4.</span> Monitor telemetry for 5 minutes to confirm recovery</p>
            </>
          ) : (
            <>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">1.</span> Confirm the agent process is running on the target host</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">2.</span> Check network connectivity between agent host and gateway</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">3.</span> Verify firewall rules allow outbound on port 443 to gateway</p>
              <p className="flex items-start gap-2"><span className="text-foreground font-medium shrink-0">4.</span> Run <span className="font-mono bg-muted/60 px-1 rounded">unixsee-agent status --verbose</span> on the host</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const { agent_id } = useParams<{ agent_id: string }>();
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);

  useEffect(() => {
    if (agent_id) getAgent(agent_id).then(setAgent);
  }, [agent_id]);

  if (agent === undefined) return (
    <DashboardShell title="Agent" subtitle="Loading…">
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm gap-2">
        <span className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
        Loading agent data…
      </div>
    </DashboardShell>
  );

  if (!agent) return (
    <DashboardShell title="Agent not found">
      <div className="card-glass p-8 text-center text-muted-foreground max-w-md">
        <WifiOff className="w-8 h-8 mx-auto mb-3 text-slate-500" />
        <p className="text-sm font-medium text-foreground mb-1">Agent not found</p>
        <p className="text-xs text-muted-foreground">No agent with ID <span className="font-mono bg-muted/60 px-1 rounded">{agent_id}</span> is registered with this gateway.</p>
        <Link href="/agents">
          <a className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to agents list
          </a>
        </Link>
      </div>
    </DashboardShell>
  );

  const isUnavailable = agent.status === "error" || agent.status === "offline";
  const freshness = getTelemetryFreshness(agent.lastSeen);

  return (
    <DashboardShell
      title={agent.name}
      subtitle={`ID: ${agent.id}`}
      actions={<StatusPill status={agent.status} size="md" />}
    >
      <div className="flex flex-col gap-5 max-w-4xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/agents" className="hover:text-foreground transition-colors">Agents</Link>
          <span>/</span>
          <span className="text-foreground">{agent.name}</span>
        </div>

        {/* Unavailable state */}
        {isUnavailable && <UnavailablePanel agent={agent} />}

        {/* Header card — overview */}
        <div className="card-glass p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">{agent.name}</h2>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{agent.id}</p>
            </div>
            <StatusPill status={agent.status} size="md" />
          </div>

          {/* Telemetry freshness */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border text-xs",
            freshness.className
          )}>
            {freshness.stale
              ? <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            <span className="font-medium">{freshness.label}</span>
            <span className="text-muted-foreground ml-auto">
              Last seen: {new Date(agent.lastSeen).toLocaleString("en-GB")}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: MapPin, label: "Region", value: agent.region },
              { icon: Clock, label: "Uptime", value: agent.uptime },
              { icon: Globe, label: "Version", value: agent.version },
              { icon: Terminal, label: "Endpoint", value: agent.endpoint.split("//")[1]?.split("/")[0] ?? agent.endpoint },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-muted/30 rounded p-3">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Icon className="w-3 h-3" />{label}
                </p>
                <p className="text-sm font-semibold truncate font-mono">{value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {agent.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics — show dimmed if unavailable */}
        <div className={cn("grid grid-cols-3 gap-3", isUnavailable && "opacity-50 pointer-events-none")}>
          <div className="card-glass p-4 text-center flex flex-col gap-1">
            <Activity className="w-5 h-5 mx-auto text-indigo-400" />
            <p className="text-2xl font-bold mt-1">{agent.requestsPerMin.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Requests / min</p>
          </div>
          <div className="card-glass p-4 text-center flex flex-col gap-1">
            <Zap className="w-5 h-5 mx-auto text-amber-400" />
            <p className="text-2xl font-bold mt-1">{agent.latencyMs}ms</p>
            <p className="text-xs text-muted-foreground">Avg latency</p>
          </div>
          <div className={cn("card-glass p-4 text-center flex flex-col gap-1", agent.errorRate > 1 && "border-red-500/20")}>
            <AlertTriangle className={cn("w-5 h-5 mx-auto", agent.errorRate > 1 ? "text-red-400" : "text-emerald-400")} />
            <p className={cn("text-2xl font-bold mt-1", agent.errorRate > 1 ? "text-red-400" : "text-emerald-400")}>
              {agent.errorRate}%
            </p>
            <p className="text-xs text-muted-foreground">Error rate</p>
          </div>
        </div>

        {/* Endpoint */}
        <div className="card-glass p-4 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
          <p className="text-sm font-mono text-primary bg-muted/30 px-3 py-2 rounded-md break-all">{agent.endpoint}</p>
        </div>

        {/* Raw meta */}
        <div className="card-glass p-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">Technical metadata</p>
          <RawJsonDrawer data={agent.meta} label="Agent metadata" />
        </div>

        {/* Full agent object */}
        <RawJsonDrawer data={agent} label="Full agent object" />
      </div>
    </DashboardShell>
  );
}
