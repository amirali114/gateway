import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { KpiCard } from "@/components/KpiCard";
import { StatusPill } from "@/components/StatusPill";
import { AgentCard } from "@/components/AgentCard";
import { ReleaseGatePanel } from "@/components/ReleaseGatePanel";
import { getDashboardData } from "@/lib/adapters/dashboard-data";
import type { DashboardData } from "@/lib/contracts";
import { Bot, Activity, AlertTriangle, Clock, Percent, Bell, Globe } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboardData().then(setData);
  }, []);

  if (!data) return (
    <DashboardShell title="داشبورد" subtitle="بارگذاری اطلاعات…">
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <span className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin ml-2" />
        در حال بارگذاری…
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="داشبورد" subtitle="نمای کلی سیستم Unixsee Gateway">
      <div className="flex flex-col gap-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="عاملان فعال"
            value={`${data.kpi.activeAgents}/${data.kpi.totalAgents}`}
            icon={Bot}
            trend="up"
            trendValue="۲ جدید"
            sub="این هفته"
            highlight={data.kpi.errorAgents > 0 ? "warning" : "success"}
          />
          <KpiCard
            label="درخواست در دقیقه"
            value={data.kpi.requestsPerMin.toLocaleString("fa-IR")}
            icon={Activity}
            trend="up"
            trendValue="۱۲٪"
            sub="نسبت به دیروز"
          />
          <KpiCard
            label="میانگین تأخیر"
            value={data.kpi.avgLatencyMs}
            unit="ms"
            icon={Clock}
            trend="down"
            trendValue="۵ms"
            sub="بهتر از دیروز"
            highlight="success"
          />
          <KpiCard
            label="هشدارهای باز"
            value={data.kpi.totalAlertsOpen}
            icon={Bell}
            highlight={data.kpi.totalAlertsOpen > 5 ? "error" : data.kpi.totalAlertsOpen > 2 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="آپ‌تایم سیستم"
            value={data.kpi.uptimePercent}
            unit="٪"
            icon={Percent}
            highlight="success"
          />
          <KpiCard
            label="عاملان خطا"
            value={data.kpi.errorAgents}
            icon={AlertTriangle}
            highlight={data.kpi.errorAgents > 0 ? "error" : "success"}
          />
          <KpiCard
            label="وضعیت گیت‌وی"
            value={data.kpi.gatewayHealth === "healthy" ? "سالم" : data.kpi.gatewayHealth === "degraded" ? "کاهش‌یافته" : "خاموش"}
            icon={Globe}
            highlight={data.kpi.gatewayHealth === "healthy" ? "success" : "warning"}
          />
          <KpiCard
            label="مسیرهای فعال"
            value={data.topRoutes.length}
            icon={Activity}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Agents column */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">عاملان اخیر</h2>
              <Link href="/agents" className="text-xs text-primary hover:underline">مشاهده همه</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.agents.slice(0, 4).map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Active release */}
            {data.activeRelease && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">انتشار جاری</h2>
                  <Link href="/release" className="text-xs text-primary hover:underline">جزئیات</Link>
                </div>
                <ReleaseGatePanel release={data.activeRelease} compact />
              </div>
            )}

            {/* Recent alerts */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">هشدارهای اخیر</h2>
                <Link href="/alerts" className="text-xs text-primary hover:underline">همه هشدارها</Link>
              </div>
              <div className="card-glass divide-y divide-border">
                {data.recentAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3">
                    <StatusPill status={alert.severity} showDot={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{alert.source}</p>
                    </div>
                    <StatusPill status={alert.status} showDot={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gateway top routes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">مسیرهای پرترافیک</h2>
            <Link href="/gateway" className="text-xs text-primary hover:underline">مدیریت گیت‌وی</Link>
          </div>
          <div className="card-glass overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">مسیر</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">متد</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">درخواست امروز</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">تأخیر</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {data.topRoutes.map(route => (
                  <tr key={route.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono ltr text-primary">{route.path}</td>
                    <td className="px-4 py-2.5">
                      <span className={`ltr text-[10px] font-mono font-bold ${route.method === "GET" ? "text-emerald-400" : route.method === "POST" ? "text-blue-400" : "text-amber-400"}`}>
                        {route.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 ltr">{route.requestsToday.toLocaleString()}</td>
                    <td className="px-4 py-2.5 ltr">{route.avgLatencyMs}ms</td>
                    <td className="px-4 py-2.5"><StatusPill status={route.status} /></td>
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
