import { redirect } from "next/navigation";
import { PageHeader } from "../../../../../components/PageHeader";
import { SectionCard } from "../../../../../components/SectionCard";
import { StatusPill } from "../../../../../components/StatusPill";
import { ErrorState } from "../../../../../components/ErrorState";
import { asRecord, getMotherAgentConfig, getMotherAgentConfigVersions, publishMotherAgentConfig, rollbackMotherAgentConfig, read, valueOrDash } from "../../../../../lib/api";
import { motherActorHeaders, requirePermission, type AuthStatus } from "../../../../../lib/auth";
import { appendAudit } from "../../../../../lib/user-store";
import { type Role } from "../../../../../lib/rbac";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ agent_id: string }>;
  searchParams?: Promise<{ action?: string; version?: string }>;
};

function auditActor(auth: AuthStatus) {
  if (auth.role === "auth-disabled") return undefined;
  return { id: auth.user_id, username: auth.username, role: auth.role as Role };
}

export default async function GatewayConfirmPage({ params, searchParams }: Params) {
  const { agent_id } = await params;
  const agentId = decodeURIComponent(agent_id);
  const sp = searchParams ? await searchParams : {};
  const action = sp.action;
  const versionParam = (sp.version || "").trim();

  if (action !== "publish" && action !== "rollback") {
    redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}`);
  }

  const safeAction: "publish" | "rollback" = action;

  let targetVersion: number | null = null;
  if (safeAction === "rollback") {
    const parsed = parseInt(versionParam, 10);
    if (!versionParam || isNaN(parsed) || parsed < 1 || String(parsed) !== versionParam) {
      redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}&error=invalid_version`);
    }
    targetVersion = parsed;
  }

  const auth = await requirePermission(safeAction === "publish" ? "gateway.config.publish" : "gateway.config.rollback");

  async function confirmPublishAction(formData: FormData): Promise<void> {
    "use server";
    const a = await requirePermission("gateway.config.publish");
    const id = String(formData.get("agent_id") || "").trim();
    const note = String(formData.get("note") || "").trim().slice(0, 240);
    const actor = auditActor(a);
    if (!id) {
      await appendAudit({ actor, action: "config.publish", target_type: "agent_config", target_id: "(empty)", result: "failure", metadata: { error: "missing_agent_id" } });
      redirect("/gateway?error=missing_agent_id");
      return;
    }
    const result = await publishMotherAgentConfig(id, note, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "config.publish", target_type: "agent_config", target_id: id, result: "failure", metadata: { mother_status: result.status } });
      redirect(`/gateway?agent_id=${encodeURIComponent(id)}&error=publish_failed`);
      return;
    }
    await appendAudit({ actor, action: "config.publish", target_type: "agent_config", target_id: id, result: "success", metadata: { mother_status: result.status, note } });
    redirect(`/gateway?agent_id=${encodeURIComponent(id)}&ok=published`);
  }

  async function confirmRollbackAction(formData: FormData): Promise<void> {
    "use server";
    const a = await requirePermission("gateway.config.rollback");
    const id = String(formData.get("agent_id") || "").trim();
    const note = String(formData.get("note") || "").trim().slice(0, 240);
    const tvRaw = parseInt(String(formData.get("target_version") || ""), 10);
    const actor = auditActor(a);
    if (!id) {
      await appendAudit({ actor, action: "config.rollback", target_type: "agent_config", target_id: "(empty)", result: "failure", metadata: { error: "missing_agent_id" } });
      redirect("/gateway?error=missing_agent_id");
      return;
    }
    if (!tvRaw || tvRaw < 1 || isNaN(tvRaw)) {
      await appendAudit({ actor, action: "config.rollback", target_type: "agent_config", target_id: id, result: "failure", metadata: { error: "invalid_version" } });
      redirect(`/gateway?agent_id=${encodeURIComponent(id)}&error=invalid_version`);
      return;
    }
    const result = await rollbackMotherAgentConfig(id, tvRaw, note, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "config.rollback", target_type: "agent_config", target_id: id, result: "failure", metadata: { mother_status: result.status, target_version: tvRaw } });
      redirect(`/gateway?agent_id=${encodeURIComponent(id)}&error=rollback_failed`);
      return;
    }
    await appendAudit({ actor, action: "config.rollback", target_type: "agent_config", target_id: id, result: "success", metadata: { mother_status: result.status, target_version: tvRaw, note } });
    redirect(`/gateway?agent_id=${encodeURIComponent(id)}&ok=rolled_back`);
  }

  const cfgResult = await getMotherAgentConfig(agentId);
  const cfg = read(cfgResult);
  const activeRecord = asRecord(cfg?.active_config);
  const draftRecord = asRecord(cfg?.draft_config);

  let targetVersionRecord = null;
  if (safeAction === "rollback" && targetVersion !== null) {
    const versionsResult = await getMotherAgentConfigVersions(agentId);
    const versionsList = read(versionsResult)?.versions || [];
    targetVersionRecord = versionsList.find((v) => v.version === targetVersion) ?? null;
  }

  const confirmAction = safeAction === "publish" ? confirmPublishAction : confirmRollbackAction;
  const actionLabel = safeAction === "publish" ? "Publish draft" : `Rollback to version ${targetVersion}`;
  const actionDesc = safeAction === "publish"
    ? "Publishing promotes the current draft config to the active config for this agent. This is a shadow-only operation — it does not affect live PHP Gateway traffic."
    : `Rolling back replaces the active config with version ${targetVersion}. This is a shadow-only operation — it does not affect live PHP Gateway traffic.`;

  return (
    <>
      <PageHeader
        eyebrow="Gateway — confirmation required"
        title={`Confirm: ${actionLabel}`}
        description={actionDesc}
        actions={
          <a className="button-link button-secondary" href={`/gateway?agent_id=${encodeURIComponent(agentId)}`}>
            Cancel — back to gateway
          </a>
        }
      />

      <div className="readonly-banner" style={{ borderColor: "var(--warn, #e0a800)", background: "var(--warn-bg, #fffbe6)" }}>
        <span>◈</span>
        <span><b>Confirmation required.</b> Review the config state below before proceeding. This operation is recorded in the audit trail. Only a subsequent rollback can reverse a publish — there is no undo from the dashboard.</span>
      </div>

      <div className="readonly-banner" style={{ borderColor: "var(--info, #1565c0)", background: "var(--info-bg, #e3f2fd)", marginTop: 0 }}>
        <span>▣</span>
        <span><b>Shadow-only mode.</b> This operation changes what Mother has stored for this agent. It does not change live PHP Gateway traffic or enforcement. PHP Gateway remains the runtime source of truth.</span>
      </div>

      <SectionCard title="Current config state" description="Fetched live from Mother at the time you loaded this page.">
        {!cfg ? (
          <ErrorState
            title="Config unavailable"
            error={!cfgResult.ok ? cfgResult.error : "Mother returned an empty config payload."}
          />
        ) : (
          <table className="kv"><tbody>
            <tr><th>Agent</th><td className="mono">{agentId}</td></tr>
            <tr><th>Active version</th><td>{valueOrDash(activeRecord.version)}</td></tr>
            <tr><th>Draft version</th><td>{valueOrDash(draftRecord.version)}</td></tr>
            {safeAction === "publish" && (
              <tr><th>Action</th><td>Promote draft version <b>{valueOrDash(draftRecord.version)}</b> to active</td></tr>
            )}
            {safeAction === "rollback" && (
              <tr><th>Action</th><td>Replace active config with version <b>{targetVersion}</b></td></tr>
            )}
          </tbody></table>
        )}
      </SectionCard>

      {safeAction === "rollback" && (
        <SectionCard title={`Target version: ${targetVersion}`} description="Details of the version you are rolling back to.">
          {!targetVersionRecord ? (
            <p style={{ color: "var(--muted)" }}>Version {targetVersion} details not available from Mother at this time.</p>
          ) : (
            <table className="kv"><tbody>
              <tr><th>Version</th><td>{valueOrDash(targetVersionRecord.version)}</td></tr>
              <tr><th>Status</th><td><StatusPill value={targetVersionRecord.status || "unknown"} /></td></tr>
              <tr><th>Published at</th><td className="mono">{valueOrDash(targetVersionRecord.published_at)}</td></tr>
              <tr><th>Source</th><td>{valueOrDash(targetVersionRecord.source)}</td></tr>
              <tr><th>Hash</th><td className="mono">{valueOrDash(targetVersionRecord.config_hash)}</td></tr>
              {targetVersionRecord.note ? <tr><th>Note</th><td>{valueOrDash(targetVersionRecord.note)}</td></tr> : null}
              {targetVersionRecord.rollback_from_version != null ? (
                <tr><th>Rollback from</th><td>version {String(targetVersionRecord.rollback_from_version)}</td></tr>
              ) : null}
            </tbody></table>
          )}
        </SectionCard>
      )}

      <SectionCard
        title={`Confirm: ${actionLabel}`}
        description="Clicking Confirm below executes the action immediately via Mother. Your username and role are recorded in the audit trail."
      >
        <form action={confirmAction} className="stack-form">
          <input type="hidden" name="agent_id" value={agentId} />
          {safeAction === "rollback" && (
            <input type="hidden" name="target_version" value={targetVersion ?? ""} />
          )}

          <div className="checklist-cards" style={{ marginBottom: 16 }}>
            <div className="checklist-card">
              <span className="checklist-card-icon">!</span>
              <span className="checklist-card-text">
                Action: <b>{actionLabel}</b> — agent <span className="mono">{agentId}</span>
              </span>
            </div>
            <div className="checklist-card">
              <span className="checklist-card-icon">▣</span>
              <span className="checklist-card-text">
                Shadow-only — this does not change live PHP Gateway traffic or enforcement.
              </span>
            </div>
            <div className="checklist-card">
              <span className="checklist-card-icon">◈</span>
              <span className="checklist-card-text">
                Actor: <b>{auth.username}</b> ({auth.role}) — recorded in audit trail
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="cfg-note" style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Note (optional, max 240 chars)
            </label>
            <input
              type="text"
              id="cfg-note"
              name="note"
              maxLength={240}
              placeholder="Reason for this action..."
              style={{ width: "100%", maxWidth: 480 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button type="submit">Confirm — {actionLabel}</button>
            <a className="button-link button-secondary" href={`/gateway?agent_id=${encodeURIComponent(agentId)}`}>
              Cancel
            </a>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Safety model" description="What this confirmation page can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">
              Permission ({safeAction === "publish" ? "gateway.config.publish" : "gateway.config.rollback"}) is checked again inside the server action — not only at page load.
            </span>
          </div>
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">The Mother management token is injected server-side only — the browser never receives it.</span>
          </div>
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">Actor identity is read from the server-side session — it cannot be supplied by the form body.</span>
          </div>
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">Every attempt — success or failure — is appended to the audit trail before redirecting.</span>
          </div>
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">No raw Mother error details are forwarded to the browser — only a sanitized error code is shown.</span>
          </div>
          <div className="checklist-card">
            <span className="checklist-card-icon">✓</span>
            <span className="checklist-card-text">Shadow-only mode: this operation does not change live PHP Gateway traffic or enforcement.</span>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
