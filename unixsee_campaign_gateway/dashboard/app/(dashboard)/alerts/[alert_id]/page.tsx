import { PageHeader } from "../../../../components/PageHeader";
import { RawJsonDrawer } from "../../../../components/RawJsonDrawer";
import { SectionCard } from "../../../../components/SectionCard";
import { StatusPill } from "../../../../components/StatusPill";
import type { PillTone } from "../../../../components/StatusPill";
import { ErrorState } from "../../../../components/ErrorState";
import { getMotherAlert, read, valueOrDash } from "../../../../lib/api";
import { requirePermission } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ alert_id: string }> };

function severityTone(severity: string | undefined): PillTone {
  if (severity === "critical") return "danger";
  if (severity === "warn" || severity === "warning") return "warning";
  if (severity === "info") return "neutral";
  return "neutral";
}

function statusTone(status: string | undefined): PillTone {
  if (status === "active") return "warning";
  if (status === "resolved") return "success";
  if (status === "muted") return "neutral";
  return "neutral";
}

function heroBadgeTone(severity: string | undefined): "danger" | "warning" | "success" | "" {
  if (severity === "critical") return "danger";
  if (severity === "warn" || severity === "warning") return "warning";
  return "";
}

export default async function AlertDetailPage({ params }: Params) {
  const { alert_id } = await params;
  const alertId = decodeURIComponent(alert_id);
  await requirePermission("alerts.view");

  const alertResult = await getMotherAlert(alertId);
  const alert = read(alertResult)?.alert;

  const unavailableError = !alertResult.ok ? alertResult.error : !alert ? "Mother returned an empty alert payload." : null;

  if (unavailableError !== null || !alert) {
    return (
      <>
        <PageHeader
          eyebrow="Alert detail"
          title={alertId}
          description="Read-only alert detail from Mother."
          actions={<a className="button-link button-secondary" href="/alerts">Back to alerts</a>}
          meta={<StatusPill tone="danger">Unavailable</StatusPill>}
        />
        <div className="section-block">
          <SectionCard title="Alert unavailable" description="Mother could not return data for this alert ID.">
            <ErrorState error={unavailableError ?? undefined} />
            <div className="checklist-cards" style={{ marginTop: 16 }}>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">The alert may have been resolved and expired from Mother&apos;s retention window — check the <a href="/alerts">alerts list</a> for current active alerts.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Mother must be reachable from the dashboard server. Check <a href="/diagnostics">Diagnostics</a> for Mother health.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">No action is taken from this dashboard. Alert state changes only through Mother.</span>
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="section-block">
          <RawJsonDrawer data={{ alertResult }} title="Raw error payload" />
        </div>
      </>
    );
  }

  const badge = heroBadgeTone(alert.severity);

  return (
    <>
      <PageHeader
        eyebrow="Alert detail"
        title={alert.title || alertId}
        description="Read-only alert detail from Mother. No management actions are available from this dashboard."
        actions={<a className="button-link button-secondary" href="/alerts">Back to alerts</a>}
        meta={<StatusPill tone={severityTone(alert.severity)}>{alert.severity || "info"}</StatusPill>}
      />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>Read-only.</b> This page shows alert data as returned by the Mother API. Resolve, mute, and acknowledge actions are intentionally not exposed — alert state changes only through Mother.</span>
      </div>

      <div className="hero-panel">
        <div className="hero-main">
          <div className={`hero-badge ${badge}`}>!</div>
          <div>
            <div className="hero-label">Alert</div>
            <div className="hero-value">
              <StatusPill tone={severityTone(alert.severity)}>{alert.severity || "info"}</StatusPill>
              {" "}
              <StatusPill tone={statusTone(alert.status)}>{alert.status || "unknown"}</StatusPill>
            </div>
            <p className="hero-sub">{alert.message || alert.title || "No message."}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Scope</span><b>{valueOrDash(alert.scope)}</b></div>
          <div className="hero-stat"><span>Agent</span><b className="mono">{valueOrDash(alert.agent_id)}</b></div>
          <div className="hero-stat"><span>Occurrences</span><b>{valueOrDash(alert.occurrence_count)}</b></div>
          <div className="hero-stat"><span>Management actions</span><b>None</b></div>
        </div>
      </div>

      {/* Identity & classification */}
      <div className="grid two section-block">
        <SectionCard title="Identity" description="Alert identifier and fingerprint as assigned by Mother.">
          <table className="kv"><tbody>
            <tr><th>Alert ID</th><td className="mono">{valueOrDash(alert.id)}</td></tr>
            <tr><th>Fingerprint</th><td className="mono">{valueOrDash(alert.fingerprint)}</td></tr>
            <tr><th>Type</th><td className="mono">{valueOrDash(alert.type)}</td></tr>
            <tr><th>Scope</th><td className="mono">{valueOrDash(alert.scope)}</td></tr>
            <tr><th>Agent</th><td className="mono">{alert.agent_id
              ? <a href={`/agents/${encodeURIComponent(alert.agent_id)}`}>{alert.agent_id}</a>
              : "—"}
            </td></tr>
          </tbody></table>
        </SectionCard>

        <SectionCard title="Severity &amp; status" description="Current severity and lifecycle status as reported by Mother.">
          <table className="kv"><tbody>
            <tr><th>Severity</th><td><StatusPill tone={severityTone(alert.severity)}>{alert.severity || "info"}</StatusPill></td></tr>
            <tr><th>Status</th><td><StatusPill tone={statusTone(alert.status)}>{alert.status || "unknown"}</StatusPill></td></tr>
            <tr><th>Occurrences</th><td>{valueOrDash(alert.occurrence_count)}</td></tr>
          </tbody></table>
        </SectionCard>
      </div>

      {/* Message */}
      <SectionCard title="Message" description="Human-readable alert title and detail message.">
        <table className="kv"><tbody>
          <tr><th>Title</th><td>{valueOrDash(alert.title)}</td></tr>
          <tr><th>Message</th><td style={{ whiteSpace: "pre-wrap" }}>{valueOrDash(alert.message)}</td></tr>
        </tbody></table>
      </SectionCard>

      {/* Timeline */}
      <SectionCard title="Timeline" description="Alert lifecycle timestamps as recorded by Mother.">
        <table className="kv"><tbody>
          <tr><th>First seen</th><td className="mono">{valueOrDash(alert.first_seen_at)}</td></tr>
          <tr><th>Last seen</th><td className="mono">{valueOrDash(alert.last_seen_at)}</td></tr>
          <tr><th>Created (timestamp)</th><td className="mono">{valueOrDash(alert.timestamp)}</td></tr>
          <tr><th>Last updated</th><td className="mono">{valueOrDash(alert.updated_at)}</td></tr>
          {alert.resolved_at
            ? <tr><th>Resolved at</th><td className="mono">{alert.resolved_at}</td></tr>
            : null}
        </tbody></table>
      </SectionCard>

      {/* Evidence / metadata */}
      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
        <SectionCard title="Evidence &amp; context" description="Additional fields attached to this alert by Mother. Raw values only — no interpretation is applied.">
          <table className="kv"><tbody>
            {Object.entries(alert.metadata).map(([k, v]) => (
              <tr key={k}>
                <th className="mono">{k}</th>
                <td className="mono" style={{ wordBreak: "break-all" }}>
                  {typeof v === "object" && v !== null
                    ? <RawJsonDrawer data={v} title={k} />
                    : String(v)}
                </td>
              </tr>
            ))}
          </tbody></table>
        </SectionCard>
      )}

      {/* Safety model */}
      <SectionCard title="Safety model" description="What this alert detail page can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Alert data is fetched server-side only — the browser never calls Mother directly.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">The Mother management token is never delivered to the browser.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No resolve, mute, acknowledge, or any write action is exposed on this page.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Alert state changes only through Mother — this page reflects, it does not control.</span></div>
        </div>
      </SectionCard>

      <div className="section-block">
        <RawJsonDrawer data={{ alertResult }} title="Raw alert payload" />
      </div>
    </>
  );
}
