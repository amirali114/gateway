import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import type { PillTone } from "../../../components/StatusPill";
import { getMotherDiagnosticsSummary, getMotherPolicies, getMotherPolicy, getMotherReady, read, valueOrDash } from "../../../lib/api";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function PolicyPage() {
  await requirePermission("policy.view");
  const [policiesResult, defaultResult, readyResult, summaryResult] = await Promise.all([
    getMotherPolicies(), getMotherPolicy("default"), getMotherReady(), getMotherDiagnosticsSummary()
  ]);
  const policies = read(policiesResult)?.policies || [];
  const defaultPolicy = read(defaultResult)?.policy;
  const ready = read(readyResult);
  const summary = read(summaryResult)?.summary;

  /* R10.16: Policy sync state */
  const policySource = ready?.policy_source || ready?.policy || defaultPolicy?.source;
  const policyStatus = ready?.policy_status || (defaultPolicy ? "active" : "unknown");
  const syncTone: PillTone = policyStatus === "active" || policyStatus === "ok" ? "success" : policyStatus === "unknown" ? "neutral" : "warning";
  const configsPendingDelivery = summary?.configs_pending_delivery ?? 0;
  const configsStale = summary?.configs_stale ?? 0;
  const rolloutPostureTone: PillTone = configsStale > 0 ? "danger" : configsPendingDelivery > 0 ? "warning" : "success";

  return (
    <>
      <PageHeader eyebrow="Policy" title="Policy Sync" description="Read-only policy catalog from Mother. Policy assignment is controlled through safe Mother APIs only." actions={<a className="button-link button-secondary" href="/gateway">Gateway control</a>} />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Read-only catalog.</b> This page shows the policies Mother currently holds. There is no editor, publish, or assignment control on this page — policy changes happen only through safe Mother APIs elsewhere.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className="hero-badge blue">◈</div>
          <div>
            <div className="hero-label">Default policy</div>
            <div className="hero-value mono">{valueOrDash(defaultPolicy?.id)}</div>
            <p className="hero-sub">Profile <span className="mono">{valueOrDash(defaultPolicy?.profile_id)}</span>, version {valueOrDash(defaultPolicy?.version)}, sourced from <span className="mono">{valueOrDash(defaultPolicy?.source)}</span>.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Sync status</span><b><StatusPill tone={syncTone}>{policyStatus}</StatusPill></b></div>
          <div className="hero-stat"><span>Policies in catalog</span><b>{policies.length}</b></div>
          <div className="hero-stat"><span>Assignment control</span><b>Mother API only</b></div>
          <div className="hero-stat"><span>Enforcement here</span><b>None</b></div>
        </div>
      </div>

      {/* R10.16: Policy sync state detail */}
      <div className="section-block">
        <SectionCard title="Policy sync state" description="Current sync posture between Mother and the registered fleet. Assignment and publishing are not available from this dashboard.">
          <div className="grid two" style={{ gap: 0 }}>
            <table className="kv"><tbody>
              <tr><th>Default policy ID</th><td className="mono">{valueOrDash(defaultPolicy?.id)}</td></tr>
              <tr><th>Profile ID</th><td className="mono">{valueOrDash(defaultPolicy?.profile_id)}</td></tr>
              <tr><th>Policy version</th><td>{valueOrDash(defaultPolicy?.version)}</td></tr>
              <tr><th>Policy source</th><td className="mono">{valueOrDash(policySource)}</td></tr>
            </tbody></table>
            <table className="kv"><tbody>
              <tr><th>Sync status</th><td><StatusPill tone={syncTone}>{policyStatus}</StatusPill></td></tr>
              <tr><th>Configs pending</th><td><StatusPill tone={configsPendingDelivery > 0 ? "warning" : "success"}>{configsPendingDelivery}</StatusPill></td></tr>
              <tr><th>Configs stale</th><td><StatusPill tone={configsStale > 0 ? "danger" : "success"}>{configsStale}</StatusPill></td></tr>
              <tr><th>Rollout posture</th><td><StatusPill tone={rolloutPostureTone}>{rolloutPostureTone === "success" ? "Delivered" : rolloutPostureTone === "warning" ? "Pending" : "Stale"}</StatusPill></td></tr>
            </tbody></table>
          </div>

          {(configsPendingDelivery > 0 || configsStale > 0) && (
            <div className="readonly-banner" style={{ marginTop: 16 }}>
              <span>!</span>
              <span>
                {configsStale > 0
                  ? `${configsStale} config${configsStale === 1 ? "" : "s"} are stale or failed delivery. `
                  : ""}
                {configsPendingDelivery > 0
                  ? `${configsPendingDelivery} config${configsPendingDelivery === 1 ? "" : "s"} pending delivery. `
                  : ""}
                Policy delivery state is controlled by Mother — no action is available from this dashboard.
              </span>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Default policy">
        <table className="kv"><tbody>
          <tr><th>ID</th><td className="mono">{valueOrDash(defaultPolicy?.id)}</td></tr>
          <tr><th>Profile ID</th><td className="mono">{valueOrDash(defaultPolicy?.profile_id)}</td></tr>
          <tr><th>Version</th><td>{valueOrDash(defaultPolicy?.version)}</td></tr>
          <tr><th>Source</th><td>{valueOrDash(defaultPolicy?.source)}</td></tr>
          <tr><th>Default</th><td><StatusPill value={defaultPolicy?.is_default ? "active" : "unknown"} /></td></tr>
        </tbody></table>
      </SectionCard>

      <SectionCard title="Policy catalog" description="All policy profiles currently known to Mother.">
        {policiesResult.ok ? policies.length ? <DataTable><thead><tr><th>ID</th><th>Profile</th><th>Version</th><th>Source</th><th>Default</th></tr></thead><tbody>{policies.map((p) => <tr key={p.id || p.profile_id}><td className="mono">{valueOrDash(p.id)}</td><td className="mono">{valueOrDash(p.profile_id)}</td><td>{valueOrDash(p.version)}</td><td>{valueOrDash(p.source)}</td><td><StatusPill value={p.is_default ? "active" : "inactive"} /></td></tr>)}</tbody></DataTable> : <EmptyState title="No policies returned" /> : <ErrorState error={policiesResult.error} />}
      </SectionCard>

      <SectionCard title="Safety posture" description="How policy sync interacts with enforcement.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Policies are read from Mother on every page load — this view cannot fall out of sync silently.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Policy assignment to agents happens only through safe, audited Mother APIs.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No policy editor, publish, or delete control exists in this dashboard.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Policies inform shadow-only agent evaluation; they do not enforce PHP Gateway traffic.</span></div>
        </div>
      </SectionCard>

      <RawJsonDrawer data={{ policiesResult, defaultResult, readyResult }} title="Raw policy payloads" />
    </>
  );
}
