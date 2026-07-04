import { DataTable } from "../../../components/DataTable";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import type { PillTone } from "../../../components/StatusPill";
import { getMotherDiagnosticsSummary, getMotherHealth, getMotherPolicy, getMotherReady, getMotherStorageStatus, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function motherOverall(healthOk?: boolean, readyOk?: boolean): { label: string; tone: PillTone; heroBadgeTone: "success" | "warning" | "danger"; sub: string } {
  if (healthOk && readyOk) {
    return { label: "Operational", tone: "success", heroBadgeTone: "success", sub: "Mother is healthy and ready. All diagnostics below are read from the local Mother API." };
  }
  if (healthOk || readyOk) {
    return { label: "Degraded", tone: "warning", heroBadgeTone: "warning", sub: "Mother is partially available. Check the health and ready indicators below." };
  }
  return { label: "Unavailable", tone: "danger", heroBadgeTone: "danger", sub: "Mother could not be reached. The dashboard is showing the last known safe defaults." };
}

export default async function MotherPage() {
  await requirePermission("settings.view");
  const [healthResult, readyResult, policyResult, summaryResult, storageResult] = await Promise.all([
    getMotherHealth(), getMotherReady(), getMotherPolicy("default"), getMotherDiagnosticsSummary(), getMotherStorageStatus()
  ]);
  const health = read(healthResult);
  const ready = read(readyResult);
  const policy = read(policyResult)?.policy;
  const summary = read(summaryResult)?.summary;
  const storage = read(storageResult);
  const overall = motherOverall(health?.ok, ready?.ok);

  const storageTone: PillTone = !storageResult.ok ? "danger" : storage?.writable === false ? "warning" : storage?.writable ? "success" : "neutral";
  const storageLabel = !storageResult.ok ? "Unavailable" : storage?.writable === false ? "Not writable" : storage?.writable ? "Writable" : "Unknown";

  const policyStatus = ready?.policy_status || (policy ? "active" : "unknown");
  const policyTone: PillTone = policyStatus === "active" || policyStatus === "ok" ? "success" : policyStatus === "unknown" ? "neutral" : "warning";

  return (
    <>
      <PageHeader eyebrow="Core" title="Mother Core" description="Read-only status for the local Mother API. The management token stays server-side only." />

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

      {/* R10.16: Mother Core status — service + mode detail */}
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

      {/* R10.16: Storage status — full detail */}
      <div className="section-block">
        <SectionCard title="Storage status" description="Persistence engine health as reported by Mother's storage endpoint.">
          {storageResult.ok && storage ? (
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
                {storage.last_error ? <tr><th>Last error</th><td style={{ color: "var(--tone-danger, #dc2626)" }}>{storage.last_error}</td></tr> : null}
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
          ) : storageResult.ok ? (
            <p className="small-muted">Mother returned an empty storage status payload.</p>
          ) : (
            <div>
              <p className="small-muted" style={{ marginBottom: 8 }}>Storage status endpoint unavailable: {storageResult.error}</p>
              <table className="kv"><tbody>
                <tr><th>Storage (ready)</th><td>{valueOrDash(ready?.storage_engine || ready?.storage)}</td></tr>
              </tbody></table>
            </div>
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
