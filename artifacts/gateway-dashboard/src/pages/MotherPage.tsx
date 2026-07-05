import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { KpiCard } from "@/components/KpiCard";
import { DataTable } from "@/components/DataTable";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { apiGet, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { PillTone } from "@/components/StatusPill";
import type { HealthResponse, ReadyResponse, MotherPolicyResponse, MotherDiagnosticsSummaryResponse, MotherStorageStatusResponse } from "@/lib/types";

export default function MotherPage() {
  const { hasPermission } = useAuth();

  const { data: healthResult } = useQuery({
    queryKey: ["mother", "health"],
    queryFn: () => apiGet<HealthResponse>("mother/health"),
  });

  const { data: readyResult } = useQuery({
    queryKey: ["mother", "ready"],
    queryFn: () => apiGet<ReadyResponse>("mother/ready"),
  });

  const { data: policyResult } = useQuery({
    queryKey: ["mother", "policy", "default"],
    queryFn: () => apiGet<MotherPolicyResponse>("mother/policies/default"),
  });

  const { data: summaryResult } = useQuery({
    queryKey: ["mother", "diagnostics", "summary"],
    queryFn: () => apiGet<MotherDiagnosticsSummaryResponse>("mother/diagnostics/summary"),
  });

  const { data: storageResult } = useQuery({
    queryKey: ["mother", "storage-status"],
    queryFn: () => apiGet<MotherStorageStatusResponse>("mother/storage-status"),
    enabled: hasPermission("settings.view"),
  });

  if (!hasPermission("diagnostics.view")) {
    return <div className="notice danger">Access denied. You do not have permission to view Mother diagnostics.</div>;
  }

  const health = read(healthResult!);
  const ready = read(readyResult!);
  const policy = read(policyResult!)?.policy;
  const summary = read(summaryResult!)?.summary;
  const storage = storageResult ? read(storageResult) : undefined;

  const storageTone: PillTone = storage?.writable ? "success" : "warning";
  const storageLabel = storage?.writable ? "writable" : "read-only or unknown";

  const policyStatus = ready?.policy_status || (policy ? "active" : "unknown");
  const policyTone: PillTone = policyStatus === "active" || policyStatus === "ok" ? "success" : "warning";

  const overall = {
    label: health?.ok ? "Online" : "Unreachable",
    tone: health?.ok ? "success" : ("danger" as PillTone),
    sub: health?.ok ? "Mother is responding to health checks." : "Mother process is unreachable or returned an error.",
    heroBadgeTone: health?.ok ? "success" : "danger",
  };

  return (
    <>
      <PageHeader
        eyebrow="Core"
        title="Mother Service"
        description="Low-level health and posture of the Mother backing service. This reflects what the dashboard server sees, not the browser."
        meta={<StatusPill tone={overall.tone}>{overall.label}</StatusPill>}
      />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Local-only, read-only.</b> This page calls the Mother API from the server only. The browser never receives the management token, and no control or command action exists on this page.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${overall.heroBadgeTone}`}>◎</div>
          <div>
            <div className="hero-label">Mother status</div>
            <div className="hero-value"><StatusPill tone={overall.tone}>{overall.label}</StatusPill></div>
            <p className="hero-sub">{overall.sub}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Health</span><b><StatusPill value={health?.ok ? "healthy" : "unavailable"} /></b></div>
          <div className="hero-stat"><span>Ready</span><b><StatusPill value={ready?.ok ? "ready" : "not-ready"} /></b></div>
          <div className="hero-stat"><span>Storage</span><b><StatusPill tone={storageTone}>{storageLabel}</StatusPill></b></div>
          <div className="hero-stat"><span>Registered agents</span><b>{summary?.total_agents ?? 0}</b></div>
        </div>
      </div>

      <div className="grid kpis">
        <KpiCard title="Health" value={<StatusPill value={health?.ok ? "healthy" : "unavailable"} />} hint={valueOrDash(health?.service)} icon="◎" tone={health?.ok ? "success" : "danger"} />
        <KpiCard title="Ready" value={<StatusPill value={ready?.ok ? "ready" : "not-ready"} />} hint={valueOrDash(ready?.storage_engine || ready?.storage)} icon="✓" tone={ready?.ok ? "success" : "warning"} />
        <KpiCard title="Mother URL" value={<StatusPill tone="blue">Local-only</StatusPill>} hint="Server-side calls only — never exposed to the browser" icon="↔" tone="blue" />
        <KpiCard title="Registered agents" value={summary?.total_agents ?? 0} icon="◉" />
      </div>

      <div className="section-block">
        <SectionCard title="Mother Core status" description="Service identity and operational mode reported by the health endpoint.">
          <div className="grid two" style={{ gap: 0 }}>
            <table className="kv"><tbody>
              <tr><th>Service</th><td>{valueOrDash(health?.service)}</td></tr>
              <tr><th>Mode</th><td><StatusPill value={health?.mode || "unknown"} /></td></tr>
              <tr><th>Health endpoint</th><td><StatusPill value={health?.ok ? "healthy" : "unavailable"} /></td></tr>
              <tr><th>Ready endpoint</th><td><StatusPill value={ready?.ok ? "ready" : "not-ready"} /></td></tr>
            </tbody></table>
            <table className="kv"><tbody>
              <tr><th>Policy source</th><td className="mono">{valueOrDash(ready?.policy_source || ready?.policy)}</td></tr>
              <tr><th>Policy status</th><td><StatusPill tone={policyTone}>{policyStatus}</StatusPill></td></tr>
              <tr><th>Storage engine</th><td><StatusPill value={ready?.storage_engine || storage?.engine || "unknown"} /></td></tr>
              <tr><th>Storage posture</th><td><StatusPill tone={storageTone}>{storageLabel}</StatusPill></td></tr>
            </tbody></table>
          </div>
          {overall.tone === "danger" && (
            <div className="readonly-banner" style={{ marginTop: 16 }}>
              <span>!</span>
              <span><b>Mother is unreachable.</b> Check that the Mother process is running and that <span className="mono">UNIXSEE_MOTHER_BASE_URL</span> points to the correct host. No action can be taken from this dashboard.</span>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="section-block">
        <SectionCard title="Storage status" description="Persistence engine health as reported by Mother's storage endpoint.">
          {storageResult && storageResult.ok && storage ? (
            <>
              <table className="kv"><tbody>
                <tr><th>Engine</th><td><StatusPill value={storage.engine || "unknown"} /></td></tr>
                <tr><th>Writable</th><td><StatusPill tone={storageTone}>{storageLabel}</StatusPill></td></tr>
                <tr><th>Last load</th><td className="mono">{valueOrDash(storage.last_load_at)}</td></tr>
                <tr><th>Last save</th><td className="mono">{valueOrDash(storage.last_save_at)}</td></tr>
                {storage.path ? <tr><th>Path</th><td className="mono">{storage.path}</td></tr> : null}
                {storage.database_connected !== undefined ? <tr><th>DB connected</th><td><StatusPill value={storage.database_connected ? "true" : "false"} /></td></tr> : null}
                {storage.schema_version !== undefined ? <tr><th>Schema version</th><td>{valueOrDash(storage.schema_version)}</td></tr> : null}
                {storage.migration_status ? <tr><th>Migration status</th><td><StatusPill value={storage.migration_status} /></td></tr> : null}
                {storage.last_query_at ? <tr><th>Last query</th><td className="mono">{valueOrDash(storage.last_query_at)}</td></tr> : null}
                {storage.last_error ? <tr><th>Last error</th><td style={{ color: "var(--danger, #ef4444)" }}>{storage.last_error}</td></tr> : null}
              </tbody></table>
              {storage.persisted_objects && Object.keys(storage.persisted_objects).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="small-muted" style={{ marginBottom: 8 }}>Persisted object counts:</div>
                  <DataTable>
                    <thead><tr><th>Collection</th><th>Count</th></tr></thead>
                    <tbody>
                      {Object.entries(storage.persisted_objects).map(([k, v]) => (
                        <tr key={k}><td className="mono">{k}</td><td>{String(v)}</td></tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </>
          ) : storageResult?.ok ? (
            <p className="small-muted">Mother returned an empty storage status payload.</p>
          ) : storageResult ? (
            <div>
              <p className="small-muted" style={{ marginBottom: 8 }}>Storage status endpoint unavailable: {storageResult.error}</p>
              <table className="kv"><tbody>
                <tr><th>Storage (ready)</th><td>{valueOrDash(ready?.storage_engine || ready?.storage)}</td></tr>
              </tbody></table>
            </div>
          ) : (
            <p className="small-muted">Storage status is only visible to users with settings.view permission.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Default policy" description="The policy profile Mother currently advertises as the default for shadow evaluation.">
        <table className="kv"><tbody>
          <tr><th>Policy ID</th><td className="mono">{valueOrDash(policy?.id)}</td></tr>
          <tr><th>Profile</th><td className="mono">{valueOrDash(policy?.profile_id)}</td></tr>
          <tr><th>Version</th><td>{valueOrDash(policy?.version)}</td></tr>
          <tr><th>Source</th><td>{valueOrDash(policy?.source)}</td></tr>
        </tbody></table>
      </SectionCard>

      <SectionCard title="Safety model" description="What this dashboard can and cannot do with Mother.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Dashboard uses server-side Mother API calls only.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Browser never receives the Mother management token.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Agents remain shadow-only; the PHP Gateway is the runtime source.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No enforcement or remote command is available in this dashboard.</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={{ healthResult, readyResult, policyResult, summaryResult, storageResult }} title="Raw Mother payloads" />
    </>
  );
}
