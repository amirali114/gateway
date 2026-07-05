import { useState } from "react";
import { useParams, useSearch, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { ErrorState } from "@/components/ErrorState";
import { StatusPill, type PillTone } from "@/components/StatusPill";
import type { MotherAlertResponse } from "@/lib/types";

export default function AlertConfirmPage() {
  const { alert_id } = useParams<{ alert_id: string }>();
  const alertId = decodeURIComponent(alert_id || "");
  const search = useSearch();
  const params = new URLSearchParams(search);
  const action = params.get("action");
  const [, setLocation] = useLocation();
  const { auth, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alertQuery = useQuery({
    queryKey: ["mother/alert", alertId],
    queryFn: () => apiGet<MotherAlertResponse>(`mother/alerts/${encodeURIComponent(alertId)}`),
  });

  if (authLoading || alertQuery.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!auth || (auth.role !== "auth-disabled" && !auth.permissions.includes("alerts.manage"))) {
    return <ErrorState title="Access Denied" error="You do not have permission to manage alerts." />;
  }

  if (action !== "resolve" && action !== "mute") {
    setLocation(`/alerts/${encodeURIComponent(alertId)}`);
    return null;
  }

  const alertResult = alertQuery.data;
  const alert = read(alertResult || { ok: false, error: "" })?.alert;

  const actionLabel = action === "resolve" ? "Resolve" : "Mute";
  const actionDesc = action === "resolve"
    ? "Marking an alert as resolved signals to Mother that the underlying issue has been addressed. This action is recorded in the audit trail."
    : "Muting an alert suppresses its notifications. The alert remains visible in the list. This action is recorded in the audit trail.";

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const endpoint = action === "resolve" ? `mother/alerts/${alertId}/resolve` : `mother/alerts/${alertId}/mute`;
    const result = await apiPost(endpoint);
    
    if (result.ok) {
      setLocation(`/alerts/${encodeURIComponent(alertId)}?ok=${action}d`);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  function severityTone(severity: string | undefined): PillTone {
    if (severity === "critical") return "danger";
    if (severity === "warn" || severity === "warning") return "warning";
    return "neutral";
  }

  function statusTone(status: string | undefined): PillTone {
    if (status === "active") return "warning";
    if (status === "resolved") return "success";
    if (status === "muted") return "neutral";
    return "neutral";
  }

  return (
    <>
      <PageHeader
        eyebrow="Alert management — confirmation required"
        title={`Confirm: ${actionLabel} alert`}
        description={actionDesc}
        actions={
          <Link className="button-link button-secondary" href={`/alerts/${encodeURIComponent(alertId)}`}>
            Cancel — back to alert
          </Link>
        }
      />

      <div className="readonly-banner" style={{ borderColor: "var(--warn, #e0a800)", background: "var(--warn-bg, #fffbe6)" }}>
        <span>◈</span>
        <span><b>Confirmation required.</b> Review the alert details below before proceeding. This action cannot be undone from the dashboard — alert state changes only through Mother.</span>
      </div>

      {error && <ErrorState title="Action failed" error={error} />}

      <SectionCard
        title="Alert to be acted on"
        description="Fetched live from Mother at the time you loaded this page."
      >
        {!alert ? (
          <ErrorState
            title="Alert unavailable"
            error={alertResult && !alertResult.ok ? alertResult.error : "Mother returned an empty alert payload."}
          />
        ) : (
          <table className="kv"><tbody>
            <tr><th>Alert ID</th><td className="mono">{valueOrDash(alert.id)}</td></tr>
            <tr><th>Title</th><td>{valueOrDash(alert.title)}</td></tr>
            <tr><th>Severity</th><td><StatusPill tone={severityTone(alert.severity)}>{alert.severity || "info"}</StatusPill></td></tr>
            <tr><th>Status</th><td><StatusPill tone={statusTone(alert.status)}>{alert.status || "unknown"}</StatusPill></td></tr>
            <tr><th>Scope</th><td className="mono">{valueOrDash(alert.scope)}</td></tr>
            <tr><th>Agent</th><td className="mono">{valueOrDash(alert.agent_id)}</td></tr>
            <tr><th>Occurrences</th><td>{valueOrDash(alert.occurrence_count)}</td></tr>
            <tr><th>Message</th><td style={{ whiteSpace: "pre-wrap" }}>{valueOrDash(alert.message)}</td></tr>
          </tbody></table>
        )}
      </SectionCard>

      <SectionCard
        title={`Confirm ${actionLabel.toLowerCase()} action`}
        description="Clicking Confirm below will execute the action immediately via Mother. Your username and role will be recorded in the audit trail."
      >
        <form onSubmit={handleConfirm} className="stack-form">
          <div className="checklist-cards" style={{ marginBottom: 16 }}>
            <div className="checklist-card">
              <span className="checklist-card-icon">!</span>
              <span className="checklist-card-text">
                Action: <b>{actionLabel}</b> alert <span className="mono">{alertId}</span>
              </span>
            </div>
            <div className="checklist-card">
              <span className="checklist-card-icon">◈</span>
              <span className="checklist-card-text">
                Actor: <b>{auth.username}</b> ({auth.role}) — recorded in audit trail
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button type="submit" disabled={isSubmitting || !alert}>
              {isSubmitting ? "Confirming..." : `Confirm — ${actionLabel} this alert`}
            </button>
            <Link className="button-link button-secondary" href={`/alerts/${encodeURIComponent(alertId)}`}>
              Cancel
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Safety model" description="What this confirmation page can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">alerts.manage permission is checked again inside the server action — not only at page load.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">The Mother management token is injected server-side only — the browser never receives it.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Actor identity is read from the server-side session — it cannot be supplied by the form body.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Every attempt — success or failure — is appended to the audit trail before redirecting.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No raw Mother error details are forwarded to the browser. Only a sanitized error code is shown.</span></div>
        </div>
      </SectionCard>
    </>
  );
}
