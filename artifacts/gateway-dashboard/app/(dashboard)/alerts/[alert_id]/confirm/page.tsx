import { redirect } from "next/navigation";
import { PageHeader } from "../../../../../components/PageHeader";
import { SectionCard } from "../../../../../components/SectionCard";
import { StatusPill } from "../../../../../components/StatusPill";
import type { PillTone } from "../../../../../components/StatusPill";
import { ErrorState } from "../../../../../components/ErrorState";
import { getMotherAlert, read, valueOrDash, resolveMotherAlert, muteMotherAlert, unmuteMotherAlert } from "../../../../../lib/api";
import { requirePermission, motherActorHeaders, type AuthStatus } from "../../../../../lib/auth";
import { appendAudit } from "../../../../../lib/user-store";
import { type Role } from "../../../../../lib/rbac";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ alert_id: string }>;
  searchParams?: Promise<{ action?: string }>;
};

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

function auditActor(auth: AuthStatus) {
  if (auth.role === "auth-disabled") return undefined;
  return { id: auth.user_id, username: auth.username, role: auth.role as Role };
}

export default async function AlertConfirmPage({ params, searchParams }: Params) {
  const auth = await requirePermission("alerts.manage");
  const { alert_id } = await params;
  const alertId = decodeURIComponent(alert_id);
  const sp = searchParams ? await searchParams : {};
  const action = sp.action;

  if (action !== "resolve" && action !== "mute" && action !== "unmute") {
    redirect(`/alerts/${encodeURIComponent(alertId)}`);
  }

  const safeAction: "resolve" | "mute" | "unmute" = action;

  async function confirmResolveAction(formData: FormData) {
    "use server";
    const a = await requirePermission("alerts.manage");
    const id = String(formData.get("alert_id") || "").trim();
    const actor = auditActor(a);
    if (!id) {
      await appendAudit({ actor, action: "alert.resolve", target_type: "alert", target_id: "(empty)", result: "failure", metadata: { error: "missing_alert_id" } });
      redirect("/alerts?error=missing_alert_id");
      return;
    }
    const result = await resolveMotherAlert(id, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "alert.resolve", target_type: "alert", target_id: id, result: "failure", metadata: { mother_status: result.status } });
      redirect(`/alerts/${encodeURIComponent(id)}?error=resolve_failed`);
      return;
    }
    await appendAudit({ actor, action: "alert.resolve", target_type: "alert", target_id: id, result: "success", metadata: { mother_status: result.status } });
    redirect(`/alerts/${encodeURIComponent(id)}?ok=resolved`);
  }

  async function confirmMuteAction(formData: FormData) {
    "use server";
    const a = await requirePermission("alerts.manage");
    const id = String(formData.get("alert_id") || "").trim();
    const actor = auditActor(a);
    if (!id) {
      await appendAudit({ actor, action: "alert.mute", target_type: "alert", target_id: "(empty)", result: "failure", metadata: { error: "missing_alert_id" } });
      redirect("/alerts?error=missing_alert_id");
      return;
    }
    const result = await muteMotherAlert(id, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "alert.mute", target_type: "alert", target_id: id, result: "failure", metadata: { mother_status: result.status } });
      redirect(`/alerts/${encodeURIComponent(id)}?error=mute_failed`);
      return;
    }
    await appendAudit({ actor, action: "alert.mute", target_type: "alert", target_id: id, result: "success", metadata: { mother_status: result.status } });
    redirect(`/alerts/${encodeURIComponent(id)}?ok=muted`);
  }

  async function confirmUnmuteAction(formData: FormData) {
    "use server";
    const a = await requirePermission("alerts.manage");
    const id = String(formData.get("alert_id") || "").trim();
    const actor = auditActor(a);
    if (!id) {
      await appendAudit({ actor, action: "alert.unmute", target_type: "alert", target_id: "(empty)", result: "failure", metadata: { error: "missing_alert_id" } });
      redirect("/alerts?error=missing_alert_id");
      return;
    }
    const result = await unmuteMotherAlert(id, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "alert.unmute", target_type: "alert", target_id: id, result: "failure", metadata: { mother_status: result.status } });
      redirect(`/alerts/${encodeURIComponent(id)}?error=unmute_failed`);
      return;
    }
    await appendAudit({ actor, action: "alert.unmute", target_type: "alert", target_id: id, result: "success", metadata: { mother_status: result.status } });
    redirect(`/alerts/${encodeURIComponent(id)}?ok=unmuted`);
  }

  const alertResult = await getMotherAlert(alertId);
  const alert = read(alertResult)?.alert;

  const actionLabel = safeAction === "resolve" ? "Resolve" : safeAction === "mute" ? "Mute" : "Unmute";
  const actionDesc = safeAction === "resolve"
    ? "Marking an alert as resolved signals to Mother that the underlying issue has been addressed. This action is recorded in the audit trail."
    : safeAction === "mute"
    ? "Muting an alert suppresses its notifications. The alert remains visible in the list. This action is recorded in the audit trail."
    : "Unmuting an alert restores its notifications. This action is recorded in the audit trail.";
  const confirmAction = safeAction === "resolve" ? confirmResolveAction : safeAction === "mute" ? confirmMuteAction : confirmUnmuteAction;

  return (
    <>
      <PageHeader
        eyebrow="Alert management — confirmation required"
        title={`Confirm: ${actionLabel} alert`}
        description={actionDesc}
        actions={
          <a className="button-link button-secondary" href={`/alerts/${encodeURIComponent(alertId)}`}>
            Cancel — back to alert
          </a>
        }
      />

      <div className="readonly-banner" style={{ borderColor: "var(--warn, #e0a800)", background: "var(--warn-bg, #fffbe6)" }}>
        <span>◈</span>
        <span><b>Confirmation required.</b> Review the alert details below before proceeding. This action cannot be undone from the dashboard — alert state changes only through Mother.</span>
      </div>

      {/* Alert summary */}
      <SectionCard
        title="Alert to be acted on"
        description="Fetched live from Mother at the time you loaded this page."
      >
        {!alert ? (
          <ErrorState
            title="Alert unavailable"
            error={!alertResult.ok ? alertResult.error : "Mother returned an empty alert payload."}
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

      {/* Confirm form */}
      <SectionCard
        title={`Confirm ${actionLabel.toLowerCase()} action`}
        description="Clicking Confirm below will execute the action immediately via Mother. Your username and role will be recorded in the audit trail."
      >
        <form action={confirmAction} className="stack-form">
          <input type="hidden" name="alert_id" value={alertId} />
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
            <button type="submit">
              Confirm — {actionLabel} this alert
            </button>
            <a className="button-link button-secondary" href={`/alerts/${encodeURIComponent(alertId)}`}>
              Cancel
            </a>
          </div>
        </form>
      </SectionCard>

      {/* Safety model */}
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
