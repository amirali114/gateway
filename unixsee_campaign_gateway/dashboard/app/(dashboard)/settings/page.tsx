import { DataTable } from "../../../components/DataTable";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { getMotherHealth, getMotherPolicies, getMotherReady, getMotherStorageStatus, motherBaseUrl, read, valueOrDash } from "../../../lib/api";
import { dashboardSecuritySummary, requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings.view");
  const security = await dashboardSecuritySummary();
  const [healthResult, readyResult, policiesResult, storageResult] = await Promise.all([getMotherHealth(), getMotherReady(), getMotherPolicies(), getMotherStorageStatus()]);
  const health = read(healthResult); const ready = read(readyResult); const storage = read(storageResult); const policies = read(policiesResult)?.policies || [];

  const allConfigured = security.auth_enabled && security.session_secret_configured && security.management_token_configured;

  return (
    <>
      <PageHeader eyebrow="Settings" title="Mother Settings" description="Safe configuration overview. No secret values are shown and no runtime files are edited from the browser." />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Posture only, never values.</b> This page shows whether auth, secrets, and Mother connectivity are configured — it never displays a secret, token, or credential value, and it cannot edit any runtime configuration file.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${allConfigured ? "success" : "warning"}`}>▣</div>
          <div>
            <div className="hero-label">Configuration posture</div>
            <div className="hero-value"><StatusPill tone={allConfigured ? "success" : "warning"}>{allConfigured ? "Fully configured" : "Needs attention"}</StatusPill></div>
            <p className="hero-sub">Dashboard auth, session secret, and management token are checked for presence only. Mother connectivity is read server-side and never exposed to the browser directly.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Auth</span><b>{security.auth_enabled ? "Enabled" : "Disabled"}</b></div>
          <div className="hero-stat"><span>Mother</span><b>{health?.ok ? "Healthy" : "Unavailable"}</b></div>
          <div className="hero-stat"><span>Storage</span><b>{storage?.engine || "Unknown"}</b></div>
          <div className="hero-stat"><span>Policies synced</span><b>{policies.length}</b></div>
        </div>
      </div>

      <div className="grid kpis"><KpiCard title="Auth" value={<StatusPill value={security.auth_enabled ? "enabled" : "disabled"} />} icon="□" /><KpiCard title="Mother" value={<StatusPill value={health?.ok ? "healthy" : "unavailable"} />} hint={motherBaseUrl} icon="◎" /><KpiCard title="Ready" value={<StatusPill value={ready?.ok ? "ready" : "not-ready"} />} icon="✓" /><KpiCard title="Storage" value={<StatusPill value={storage?.engine || "unknown"} />} hint={storage?.writable ? "writable" : "not writable"} icon="▣" /></div>
      <div className="grid two" style={{ marginTop: 14 }}>
        <SectionCard title="Dashboard security"><table className="kv"><tbody><tr><th>Auth enabled</th><td><StatusPill value={security.auth_enabled} /></td></tr><tr><th>Session secret</th><td><StatusPill value={security.session_secret_configured ? "configured" : "missing"} /></td></tr><tr><th>Management token</th><td><StatusPill value={security.management_token_configured ? "server-side" : "missing"} /></td></tr><tr><th>Trust proxy</th><td><StatusPill value={security.trust_proxy} /></td></tr><tr><th>User store</th><td className="mono">{valueOrDash(security.user_store_path)}</td></tr></tbody></table></SectionCard>
        <SectionCard title="Mother policies">{policies.length ? <DataTable><thead><tr><th>ID</th><th>Profile</th><th>Version</th><th>Source</th></tr></thead><tbody>{policies.map((p) => <tr key={p.id || p.profile_id}><td className="mono">{valueOrDash(p.id)}</td><td className="mono">{valueOrDash(p.profile_id)}</td><td>{valueOrDash(p.version)}</td><td>{valueOrDash(p.source)}</td></tr>)}</tbody></DataTable> : <div className="empty-state">No policies returned.</div>}</SectionCard>
      </div>

      <SectionCard title="Safety posture" description="What this settings view can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Secret and token fields show configured/missing status only — actual values are never rendered.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Mother is reached exclusively from the server; the browser never receives a direct Mother connection or its token.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No runtime configuration file, environment variable, or secret can be edited from this page.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Policy and storage details shown here are evidence, not a control surface.</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={{ security, healthResult, readyResult, storageResult }} title="Raw settings payload" />
    </>
  );
}
