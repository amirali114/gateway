import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { AgentCard } from "@/components/AgentCard";
import { StatusPill } from "@/components/StatusPill";
import { getAgents } from "@/lib/adapters/dashboard-data";
import type { Agent, AgentStatus } from "@/lib/contracts";
import { Search, Filter } from "lucide-react";

const statusFilters: { value: AgentStatus | "all"; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "degraded", label: "کاهش‌یافته" },
  { value: "error", label: "خطا" },
  { value: "idle", label: "بیکار" },
  { value: "offline", label: "آفلاین" },
];

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
    <DashboardShell title="عاملان" subtitle={`${counts.total} عامل — ${counts.active} فعال، ${counts.error + counts.degraded} دارای مشکل`}>
      <div className="flex flex-col gap-4">

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "کل عاملان", value: counts.total, color: "text-foreground" },
            { label: "فعال", value: counts.active, color: "text-emerald-400" },
            { label: "خطا", value: counts.error, color: "text-red-400" },
            { label: "کاهش‌یافته", value: counts.degraded, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-md px-3 py-1.5 text-sm flex-1 max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجوی عامل…"
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
          <div className="card-glass p-12 text-center text-muted-foreground text-sm">
            عاملی با این فیلتر یافت نشد
          </div>
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
