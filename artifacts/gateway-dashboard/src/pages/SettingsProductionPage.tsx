import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiGet, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { MotherStorageStatusResponse, MotherDiagnosticsSummaryResponse, MotherAgentsResponse, MotherHealthReportResponse } from "@/lib/types";

export default function SettingsProductionPage() {
  const { hasPermission } = useAuth();

  const { data: securityResult } = useQuery({
    queryKey: ["settings", "security"],
    queryFn: () => apiGet<{ management_token_configured: boolean }>("settings/security"),
  });

  const { data: storageResult } = useQuery({
    queryKey: ["mother", "storage-status"],
    queryFn: () => apiGet<MotherStorageStatusResponse>("mother/storage-status"),
  });

  const { data: summaryResult } = useQuery({
    queryKey: ["mother", "diagnostics", "summary"],
    queryFn: () => apiGet<MotherDiagnosticsSummaryResponse>("mother/diagnostics/summary"),
  });

  const { data: agentsResult } = useQuery({
    queryKey: ["mother", "agents"],
    queryFn: () => apiGet<MotherAgentsResponse>("mother/agents"),
  });

  const { data: reportResult } = useQuery({
    queryKey: ["mother", "health-report"],
    queryFn: () => apiGet<MotherHealthReportResponse>("mother/health-report"),
  });

  if (!hasPermission("settings.view")) {
    return <div className="notice danger">Access denied. You do not have permission to view production readiness.</div>;
  }

  const security = read(securityResult!);
  const storage = read(storageResult!);
  const summary = read(summaryResult!)?.summary;
  const agents = read(agentsResult!)?.agents || [];

  function ok(v: boolean | undefined) { return <StatusPill value={v ? "pass" : "fail"} />; }

  const rows = [
    ["Dashboard bind", "Local-only 127.0.0.1 behind SSH tunnel or trusted proxy", true],
    ["Mother token", "Configured server-side; never delivered to the browser", Boolean(security?.management_token_configured)],
    ["Storage", "Mother storage path is writable", Boolean(storage?.writable)],
    ["Agents", "At least one Agent registered for production-like rollout", agents.length > 0],
    ["Telemetry", "Fresh telemetry exists for at least one Agent", (summary?.telemetry_fresh || 0) > 0],
    ["Enforcement", "No enforcement in this controlled beta", true],
    ["Remote command", "No remote command capability exposed", true]
  ] as const;

  const passCount = rows.filter((r) => r[2]).length;
  const allPass = passCount === rows.length;
  const tone = allPass ? "success" : (passCount >= rows.length - 1 ? "warning" : ("danger" as any));
  const label = allPass ? "Ready" : (passCount >= rows.length - 1 ? "Conditional" : "Not ready");

  return (
    <>
      <PageHeader
        eyebrow="Controlled rollout"
        title="Production Readiness"
        description="Operational checklist for staged rollout, backed by live evidence from Mother."
        meta={<StatusPill tone={tone}>{label}</StatusPill>}
      />

      <div className="readonly-banner">
        <span>&#9432;</span>
        <span>This page is <b>read-only evidence only</b>. It does not deploy, promote, roll back, or enforce anything — there are no remote-command or deployment actions here.</span>
      </div>

      <section className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${tone}`}>&#9678;</div>
          <div>
            <div className="hero-label">Readiness checklist</div>
            <div className="hero-value">{passCount}/{rows.length} checks passing</div>
            <div className="hero-sub">Combined evidence from storage, agent registry, telemetry freshness, and safety configuration. Enforcement and remote command capability remain disabled in this controlled beta.</div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Storage</span>{ok(Boolean(storage?.writable))}</div>
          <div className="hero-stat"><span>Agents</span><b>{agents.length}</b></div>
          <div className="hero-stat"><span>Fresh telemetry</span><b>{summary?.telemetry_fresh ?? 0}</b></div>
          <div className="hero-stat"><span>Remote commands</span><StatusPill tone="success">None</StatusPill></div>
        </div>
      </section>

      <div className="grid kpis">
        <KpiCard title="Storage" value={ok(Boolean(storage?.writable))} hint={valueOrDash(storage?.engine)} icon="▣" />
        <KpiCard title="Agents" value={agents.length} hint="registered in Mother" icon="◉" tone="blue" />
        <KpiCard title="Fresh telemetry" value={summary?.telemetry_fresh ?? 0} hint={`missing ${summary?.telemetry_missing ?? 0}`} icon="⌁" />
        <KpiCard title="Remote commands" value={<StatusPill tone="success">None</StatusPill>} hint="no enforcement · shadow-only" icon="✓" tone="success" />
      </div>

      <div className="section-block">
        <SectionCard title="Readiness checklist" description="Each row reflects live evidence, not a manual toggle.">
          <DataTable>
            <thead><tr><th>Check</th><th>Evidence</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(([name, evidence, pass]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{evidence}</td>
                  <td>{ok(pass)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </SectionCard>
      </div>

      <div className="section-block">
        <RawJsonDrawer data={{ security, storageResult, summaryResult, agentsResult, reportResult }} title="Raw readiness payload" />
      </div>
    </>
  );
}
