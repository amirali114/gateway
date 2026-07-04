import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPill } from "@/components/StatusPill";
import { getGatewayRoutes } from "@/lib/adapters/dashboard-data";
import type { GatewayRoute } from "@/lib/contracts";
import { Globe, Lock, Unlock, Activity, Zap, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const methodColor = { GET: "text-emerald-400", POST: "text-blue-400", PUT: "text-amber-400", DELETE: "text-red-400", PATCH: "text-purple-400" };

export default function GatewayPage() {
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "shadow">("all");

  useEffect(() => { getGatewayRoutes().then(setRoutes); }, []);

  const filtered = filter === "all" ? routes : routes.filter(r => r.status === filter);

  const totalRequests = routes.reduce((s, r) => s + r.requestsToday, 0);
  const activeRoutes = routes.filter(r => r.status === "active").length;

  return (
    <DashboardShell
      title="مدیریت دروازه"
      subtitle={`${routes.length} مسیر — ${totalRequests.toLocaleString("fa-IR")} درخواست امروز`}
    >
      <div className="flex flex-col gap-4">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "کل مسیرها", value: routes.length, color: "" },
            { label: "مسیرهای فعال", value: activeRoutes, color: "text-emerald-400" },
            { label: "درخواست امروز", value: totalRequests.toLocaleString("fa-IR"), color: "text-indigo-400" },
            { label: "میانگین تأخیر", value: `${Math.round(routes.filter(r => r.avgLatencyMs > 0).reduce((s, r) => s + r.avgLatencyMs, 0) / (routes.filter(r => r.avgLatencyMs > 0).length || 1))}ms`, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="card-glass p-3 text-center">
              <p className={cn("text-xl font-bold ltr", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {(["all", "active", "inactive", "shadow"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border transition-colors",
                filter === f ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {f === "all" ? "همه" : f === "active" ? "فعال" : f === "inactive" ? "غیرفعال" : "سایه"}
            </button>
          ))}
        </div>

        {/* Routes table */}
        <div className="card-glass overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">مسیر</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">متد</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">عامل upstream</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">محدودیت نرخ</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">احراز هویت</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">درخواست امروز</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">تأخیر</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(route => (
                <tr key={route.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 ltr font-mono text-primary">{route.path}</td>
                  <td className="px-4 py-3">
                    <span className={cn("ltr font-mono font-bold text-[11px]", methodColor[route.method as keyof typeof methodColor] ?? "text-foreground")}>
                      {route.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 ltr font-mono text-muted-foreground text-[11px]">{route.upstreamAgent}</td>
                  <td className="px-4 py-3 ltr">
                    {route.rateLimit === 0 ? <span className="text-muted-foreground">بدون محدودیت</span> : `${route.rateLimit}/min`}
                  </td>
                  <td className="px-4 py-3">
                    {route.authRequired
                      ? <span className="flex items-center gap-1 text-emerald-400"><Lock className="w-3 h-3" />فعال</span>
                      : <span className="flex items-center gap-1 text-muted-foreground"><Unlock className="w-3 h-3" />عمومی</span>}
                  </td>
                  <td className="px-4 py-3 ltr">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      {route.requestsToday.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 ltr">
                    {route.avgLatencyMs > 0
                      ? <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-muted-foreground" />{route.avgLatencyMs}ms</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={route.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
