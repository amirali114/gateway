import { useState } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { ErrorState } from "@/components/ErrorState";
import { StatusPill, type PillTone } from "@/components/StatusPill";
import type { MotherAlertResponse } from "@/lib/types";

export default function AlertDetailPage() {
  const { alert_id } = useParams<{ alert_id: string }>();
  const alertId = decodeURIComponent(alert_id || "");
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const okParam = searchParams.get("ok");
  const errorParam = searchParams.get("error");
  
  const { auth, loading: authLoading, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const alertQuery = useQuery({
    queryKey: ["mother/alert", alertId],
    queryFn: () => apiGet<MotherAlertResponse>(`mother/alerts/${encodeURIComponent(alertId)}`),
  });

  if (authLoading || alertQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("alerts.view"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to view alert details." />;
  }

  const canManage = hasPermission("alerts.manage");
  const alertResult = alertQuery.data;
  const alert = read(alertResult || { ok: false, error: "" })?.alert;
  const unavailableError = !alertResult?.ok ? alertResult?.error : !alert ? "Mother returned an empty alert payload." : null;

  async function handleUnmute() {
    setIsSubmitting(true);
    setLocalError(null);
    setLocalSuccess(null);
    const result = await apiPost(`mother/alerts/${alertId}/unmute`);
    if (result.ok) {
      setLocalSuccess("Alert has been unmuted.");
      queryClient.invalidateQueries({ queryKey: ["mother/alert", alertId] });
    } else {
      setLocalError(result.error);
    }
    setIsSubmitting(false);
  }

  if (unavailableError !== null || !alert) {
    return (
      <>
        <PageHeader
          eyebrow="Alert detail"
          title={alertId}
          description="Alert detail from Mother."
          actions={<Link className="button-link button-secondary" href="/alerts">Back to alerts</Link>}
          meta={<StatusPill tone="danger">Unavailable</StatusPill>}
        />
        {(errorParam || localError) ? <ErrorState title="Action failed" error={errorParam || localError || ""} /> : null}
        <div className="section-block">
          <SectionCard title="Alert unavailable" description="Mother could not return data for this alert ID.">
            <ErrorState error={unavailableError ?? undefined} />
            <div className="checklist-cards" style={{ marginTop: 16 }}>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">The alert may have been resolved and expired from Mother's retention window — check the <Link href="/alerts">alerts list</Link> for current active alerts.</span>
              </div>
              <div className="checklist-card">
                <span className="checklist-card-icon">◈</span>
                <span className="checklist-card-text">Mother must be reachable from the dashboard server. Check <Link href="/diagnostics">Diagnostics</Link> for Mother health.</span>
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

  const badge = heroBadgeTone(alert.severity);
  const KNOWN_OK = new Set(["resolved", "muted", "unmuted"]);
  const safeOk = (okParam && KNOWN_OK.has(okParam)) ? okParam : localSuccess;

  return (
    <>
      <PageHeader
        eyebrow="Alert detail"
        title={alert.title || alertId}
        description={canManage
          ? "Alert detail from Mother. Resolve, mute, and unmute actions are available below. Every action is recorded in the audit trail."
          : "Read-only alert detail from Mother. You have view-only access — management actions require alerts.manage permission."}
        actions={<Link className="button-link button-secondary" href="/alerts">Back to alerts</Link>}
        meta={<StatusPill tone={severityTone(alert.severity)}>{alert.severity || "info"}</StatusPill>}
      />

      {canManage ? (
        <div className="readonly-banner" style={{ borderColor: "var(--warn, #e0a800)", background: "var(--warn-bg, #fffbe6)" }}>
          <span>◈</span>
          <span><b>Management actions enabled.</b> Resolve and mute require confirmation on the next page. Unmute is immediate. Every action is server-side and recorded in the audit trail.</span>
        </div>
      ) : (
        <div className="readonly-banner">
          <span>◈</span>
          <span><b>Read-only.</b> You have view-only access. Alert state changes only through Mother. Management actions require alerts.manage permission.</span>
        </div>
      )}

      {safeOk ? (
        <div className="notice">Action completed: <b>{safeOk}</b>. Alert state has been updated in Mother.</div>
      ) : null}
      {(errorParam || localError) ? (
        <ErrorState title="Action failed" error={errorParam || localError || ""} />
      ) : null}

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
          <div className="hero-stat">
            <span>Management</span>
            <b>{canManage ? "Resolve / Mute / Unmute" : "View only"}</b>
          </div>
        </div>
      </div>

      <div className="grid two section-block">
        <SectionCard title="Identity" description="Alert identifier and fingerprint as assigned by Mother.">
          <table className="kv"><tbody>
            <tr><th>Alert ID</th><td className="mono">{valueOrDash(alert.id)}</td></tr>
            <tr><th>Fingerprint</th><td className="mono">{valueOrDash(alert.fingerprint)}</td></tr>
            <tr><th>Type</th><td className="mono">{valueOrDash(alert.type)}</td></tr>
            <tr><th>Scope</th><td className="mono">{valueOrDash(alert.scope)}</td></tr>
            <tr><th>Agent</th><td className="mono">{alert.agent_id
              ? <Link href={`/agents/${encodeURIComponent(alert.agent_id)}`}>{alert.agent_id}</Link>
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

      <SectionCard title="Message" description="Human-readable alert title and detail message.">
        <table className="kv"><tbody>
          <tr><th>Title</th><td>{valueOrDash(alert.title)}</td></tr>
          <tr><th>Message</th><td style={{ whiteSpace: "pre-wrap" }}>{valueOrDash(alert.message)}</td></tr>
        </tbody></table>
      </SectionCard>

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

      {canManage && (
        <SectionCard title="Alert management" description="All actions run server-side. Every attempted action — success or failure — is recorded in the audit trail. Resolve and mute require a confirmation step.">
          <div className="checklist-cards">
            <div className="checklist-card">
              <span className="checklist-card-icon">!</span>
              <span className="checklist-card-text">
                <b>Resolve</b> — marks this alert as resolved. Use when the underlying issue is confirmed fixed.
                {" "}
                <Link
                  className="button-link button-secondary"
                  href={`/alerts/${encodeURIComponent(alertId)}/confirm?action=resolve`}
                >
                  Resolve this alert →
                </Link>
              </span>
            </div>
            <div className="checklist-card">
              <span className="checklist-card-icon">◈</span>
              <span className="checklist-card-text">
                <b>Mute</b> — suppresses future notifications for this alert. The alert remains in Mother's active list.
                {" "}
                <Link
                  className="button-link button-secondary"
                  href={`/alerts/${encodeURIComponent(alertId)}/confirm?action=mute`}
                >
                  Mute this alert →
                </Link>
              </span>
            </div>
            {alert.status === "muted" && (
              <div className="checklist-card">
                <span className="checklist-card-icon">↻</span>
                <span className="checklist-card-text">
                  <b>Unmute</b> — restores notification status for a muted alert. This action is immediate.
                  {" "}
                  <button
                    className="button-link button-secondary"
                    onClick={handleUnmute}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Unmuting..." : "Unmute now →"}
                  </button>
                </span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <div className="section-block">
        <RawJsonDrawer data={{ alertResult }} title="Raw alert payload" />
      </div>
    </>
  );
}
