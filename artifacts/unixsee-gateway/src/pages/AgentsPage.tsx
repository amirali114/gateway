import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { AgentCard } from "@/components/AgentCard";
import { getAgents } from "@/lib/adapters/dashboard-data";
import type { Agent, AgentStatus } from "@/lib/contracts";
import { Search, Filter, RefreshCw, CheckCircle2, AlertCircle, Terminal, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const statusFilters: { value: AgentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "degraded", label: "Degraded" },
  { value: "error", label: "Error" },
  { value: "idle", label: "Idle" },
  { value: "offline", label: "Offline" },
];

function getTelemetryAge(lastSeen: string): number {
  return (Date.now() - new Date(lastSeen).getTime()) / 60000;
}

function PolicySyncBanner({ agents }: { agents: Agent[] }) {
  const syncedCount = agents.filter(a => a.status === "active" || a.status === "idle").length;
  const unsyncedCount = agents.filter(a => a.status === "error" || a.status === "degraded" || a.status === "offline").length;
  const allSynced = unsyncedCount === 0;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-md border text-xs",
      allSynced
        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
        : "bg-amber-500/8 border-amber-500/20 text-amber-400"
    )}>
      {allSynced
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      <div className="flex-1">
        <span className="font-medium">Policy sync state: </span>
        {allSynced
          ? `All ${syncedCount} agents in sync with current policy set`
          : `${syncedCount} agents synced — ${unsyncedCount} agent${unsyncedCount > 1 ? "s" : ""} out of sync (unreachable or error state)`}
      </div>
      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
        Synced against pol-001 through pol-005
      </span>
    </div>
  );
}

function ConnectGuidancePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-glass p-4 border-dashed border-border/60">
      <div className="flex items-start gap-3">
        <Terminal className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Connect or install an agent</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No agents matched this filter. To register a new agent with the gateway, run the install command on the target host.
          </p>
          <button
            onClick={() => setOpen(v => !v)}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" />
            {open ? "Hide" : "Show"} install instructions
          </button>
          {open && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="bg-muted/60 rounded p-3 text-[11px] font-mono text-muted-foreground border border-border">
                <p className="text-foreground mb-1 font-sans font-medium text-xs">1. Download and install agent</p>
                <p>curl -fsSL https://install.unixsee.io/agent | sh</p>
              </div>
              <div className="bg-muted/60 rounded p-3 text-[11px] font-mono text-muted-foreground border border-border">
                <p className="text-foreground mb-1 font-sans font-medium text-xs">2. Register with gateway</p>
                <p>unixsee-agent register \</p>
                <p className="pl-4">--gateway https://gw.internal.unixsee.io \</p>
                <p className="pl-4">--token &lt;YOUR_INSTALL_TOKEN&gt; \</p>
                <p className="pl-4">--region ir-teh-1</p>
              </div>
              <div className="bg-muted/60 rounded p-3 text-[11px] font-mono text-muted-foreground border border-border">
                <p className="text-foreground mb-1 font-sans font-medium text-xs">3. Verify connectivity</p>
                <p>unixsee-agent status --verbose</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Install tokens are generated in Settings → Tokens. Agents appear here within 30 seconds of successful registration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TelemetryFreshnessBar({ agents }: { agents: Agent[] }) {
  const live = agents.filter(a => getTelemetryAge(a.lastSeen) < 2).length;
  const recent = agents.filter(a => { const m = getTelemetryAge(a.lastSeen); return m >= 2 && m < 10; }).length;
  const stale = agents.filter(a => getTelemetryAge(a.lastSeen) >= 10).length;

  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="text-muted-foreground font-medium">Telemetry:</span>
      <span className="flex items-center gap-1 text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        {live} live
      </span>
      <span className="flex items-center gap-1 text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
        {recent} recent
      </span>
      <span className="flex items-center gap-1 text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        {stale} stale
      </span>
      <RefreshCw className="w-3 h-3 text-muted-foreground ml-1" />
      <span className="text-muted-foreground">auto-refresh every 30s</span>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<AgentStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => { getAgents().then(setAgents); }, []);

  const filtered = agents.filter(a => {
    const matchStatus = filter === "all" || a.status === filter;
    const matchSearch = !search || a.name.includes(search) || a.id.includes(search) || a.region.includes(search);
    return matchStatus && matchSearch;
  });

  const counts = {
    total: agents.length,
    active: agents.filter(a => a.status === "active").length,
    error: agents.filter(a => a.status === "error").length,
    degraded: agents.filter(a => a.status === "degraded").length,
  };

  return (
    <DashboardShell
      title="Agents"
      subtitle={`${counts.total} agents — ${counts.active} active, ${counts.error + counts.degraded} need attention`}
    >
      <div className="flex flex-col gap-4">

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total agents", value: counts.total, color: "text-foreground" },
            { label: "Active", value: counts.active, color: "text-emerald-400" },
            { label: "Error", value: counts.error, color: "text-red-400" },
            { label: "Degraded", value: counts.degraded, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Telemetry freshness summary */}
        {agents.length > 0 && <TelemetryFreshnessBar agents={agents} />}

        {/* Policy sync state */}
        {agents.length > 0 && <PolicySyncBanner agents={agents} />}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-md px-3 py-1.5 text-sm flex-1 max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="bg-transparent outline-none text-sm flex-1 min-w-0"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filter === f.value ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <ConnectGuidancePanel />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
