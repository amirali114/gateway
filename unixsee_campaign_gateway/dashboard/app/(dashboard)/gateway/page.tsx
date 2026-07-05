import { redirect } from "next/navigation";
import { AgentSelector } from "../../../components/AgentSelector";
import { DataTable } from "../../../components/DataTable";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { KpiCard } from "../../../components/KpiCard";
import { PageHeader } from "../../../components/PageHeader";
import { RawJsonDrawer } from "../../../components/RawJsonDrawer";
import { SectionCard } from "../../../components/SectionCard";
import { StatusPill } from "../../../components/StatusPill";
import { asRecord, getMotherAgentConfig, getMotherAgentConfigDiff, getMotherAgentConfigDraft, getMotherAgentConfigVersions, getMotherAgents, read, validateMotherAgentConfig, valueOrDash } from "../../../lib/api";
import { hasPermission, motherActorHeaders, requirePermission, type AuthStatus } from "../../../lib/auth";
import { type Role } from "../../../lib/rbac";
import { appendAudit } from "../../../lib/user-store";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    agent_id?: string;
    validate_ok?: string;
    validate_error?: string;
    ok?: string;
    error?: string;
  }>;
};

function configFrom(record: unknown) { const r = asRecord(record); return asRecord(r.config); }

function auditActor(auth: AuthStatus) {
  if (auth.role === "auth-disabled") return undefined;
  return { id: auth.user_id, username: auth.username, role: auth.role as Role };
}

const KNOWN_VALIDATE_OK = new Set(["valid"]);
const KNOWN_VALIDATE_ERROR = new Set(["draft_unavailable", "validate_request_failed", "validation_failed"]);
const KNOWN_OK = new Set(["published", "rolled_back"]);
const KNOWN_ERROR = new Set(["missing_agent_id", "publish_failed", "rollback_failed", "invalid_version"]);

export default async function GatewayPage({ searchParams }: Props) {
  const auth = await requirePermission("gateway.view");
  const sp = searchParams ? await searchParams : {};

  const safeValidateOk = sp.validate_ok && KNOWN_VALIDATE_OK.has(sp.validate_ok) ? sp.validate_ok : null;
  const safeValidateError = sp.validate_error && KNOWN_VALIDATE_ERROR.has(sp.validate_error) ? sp.validate_error : null;
  const safeOk = sp.ok && KNOWN_OK.has(sp.ok) ? sp.ok : null;
  const safeError = sp.error && KNOWN_ERROR.has(sp.error) ? sp.error : null;

  const canValidate = hasPermission(auth, "gateway.config.validate");
  const canPublish = hasPermission(auth, "gateway.config.publish");
  const canRollback = hasPermission(auth, "gateway.config.rollback");
  const hasAnyConfigWrite = canValidate || canPublish || canRollback;

  const agentsResult = await getMotherAgents();
  const agents = read(agentsResult)?.agents || [];
  const selectedAgent = sp.agent_id || agents[0]?.agent_id || "";
  const [cfgResult, diffResult, versionsResult] = selectedAgent ? await Promise.all([
    getMotherAgentConfig(selectedAgent),
    getMotherAgentConfigDiff(selectedAgent),
    getMotherAgentConfigVersions(selectedAgent)
  ]) : [undefined, undefined, undefined] as const;
  const activeRecord = asRecord(read(cfgResult!)?.active_config);
  const draftRecord = asRecord(read(cfgResult!)?.draft_config);
  const activeConfig = configFrom(activeRecord);
  const versions = read(versionsResult!)?.versions || [];
  const dirty = Boolean(read(diffResult!)?.diff?.dirty);

  async function validateDraftAction(formData: FormData): Promise<void> {
    "use server";
    const a = await requirePermission("gateway.config.validate");
    const agentId = String(formData.get("agent_id") || "").trim();
    const actor = auditActor(a);
    if (!agentId) {
      await appendAudit({ actor, action: "config.validate", target_type: "agent_config", target_id: "(empty)", result: "failure", metadata: { error: "missing_agent_id" } });
      redirect("/gateway?error=missing_agent_id");
      return;
    }
    const draftResult = await getMotherAgentConfigDraft(agentId);
    if (!draftResult.ok) {
      await appendAudit({ actor, action: "config.validate", target_type: "agent_config", target_id: agentId, result: "failure", metadata: { error: "draft_unavailable", mother_status: draftResult.status } });
      redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=draft_unavailable`);
      return;
    }
    const draft = asRecord(read(draftResult)?.draft_config);
    const configToValidate = draft.config ?? {};
    const result = await validateMotherAgentConfig(agentId, configToValidate, motherActorHeaders(a));
    if (!result.ok) {
      await appendAudit({ actor, action: "config.validate", target_type: "agent_config", target_id: agentId, result: "failure", metadata: { mother_status: result.status } });
      redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validate_request_failed`);
      return;
    }
    const valid = read(result)?.validation?.valid;
    if (!valid) {
      await appendAudit({ actor, action: "config.validate", target_type: "agent_config", target_id: agentId, result: "failure", metadata: { mother_status: result.status, validation_valid: false } });
      redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validation_failed`);
      return;
    }
    await appendAudit({ actor, action: "config.validate", target_type: "agent_config", target_id: agentId, result: "success", metadata: { mother_status: result.status, validation_valid: true } });
    redirect(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_ok=valid`);
  }

  const bannerText = hasAnyConfigWrite
    ? "PHP Gateway is the runtime source of truth. Agents run in shadow-only mode — they observe and compare, they do not enforce. Config validate, publish, and rollback controls are available below for authorised roles. These actions do not change live traffic."
    : "PHP Gateway is the runtime source of truth. Agents run in shadow-only mode — they observe and compare, they do not enforce. This page only reflects what Mother has stored; no write, publish, or rollback action is available to your current role.";

  return (
    <>
      <PageHeader
        eyebrow="Gateway"
        title="Gateway Control"
        description={hasAnyConfigWrite
          ? "Shadow-only control-plane view. Validate, publish, and rollback controls are available below for authorised roles."
          : "Safe read-only control-plane view. Write, publish, and rollback actions are not available to your current role."}
        actions={<StatusPill tone="blue">Shadow-only</StatusPill>}
      />

      <div className="readonly-banner">
        <span>◈</span>
        <span><b>PHP Gateway is the runtime source of truth.</b> {bannerText.replace("PHP Gateway is the runtime source of truth. ", "")}</span>
      </div>

      {safeOk && (
        <div className="readonly-banner" style={{ borderColor: "var(--success, #2e7d32)", background: "var(--success-bg, #e8f5e9)" }}>
          <span>✓</span>
          <span>
            {safeOk === "published" && <><b>Published.</b> Draft config has been promoted to active for this agent. The audit trail has been updated.</>}
            {safeOk === "rolled_back" && <><b>Rolled back.</b> Active config has been replaced with the target version for this agent. The audit trail has been updated.</>}
          </span>
        </div>
      )}

      {safeError && (
        <div className="readonly-banner" style={{ borderColor: "var(--danger, #c62828)", background: "var(--danger-bg, #fdecea)" }}>
          <span>✗</span>
          <span>
            <b>Action failed.</b>{" "}
            {safeError === "missing_agent_id" && "No agent was selected. Select an agent and try again."}
            {safeError === "publish_failed" && "Mother rejected the publish request. The config was not changed. Check the audit trail for details."}
            {safeError === "rollback_failed" && "Mother rejected the rollback request. The config was not changed. Check the audit trail for details."}
            {safeError === "invalid_version" && "The rollback target version was missing or invalid. Select a valid version from the history table."}
          </span>
        </div>
      )}

      {safeValidateOk && (
        <div className="readonly-banner" style={{ borderColor: "var(--success, #2e7d32)", background: "var(--success-bg, #e8f5e9)" }}>
          <span>✓</span>
          <span><b>Validation passed.</b> Mother confirmed the current draft config is valid. You may proceed to publish.</span>
        </div>
      )}

      {safeValidateError && (
        <div className="readonly-banner" style={{ borderColor: "var(--danger, #c62828)", background: "var(--danger-bg, #fdecea)" }}>
          <span>✗</span>
          <span>
            <b>Validation failed.</b>{" "}
            {safeValidateError === "draft_unavailable" && "The draft config could not be fetched from Mother. Ensure a draft exists for this agent."}
            {safeValidateError === "validate_request_failed" && "Mother did not accept the validation request. Check Mother connectivity."}
            {safeValidateError === "validation_failed" && "Mother reports the draft config is invalid. Review the draft config before publishing."}
          </span>
        </div>
      )}

      <div className="hero-panel">
        <div className="hero-main">
          <div className="hero-badge blue">▣</div>
          <div>
            <div className="hero-label">Runtime mode</div>
            <div className="hero-value"><StatusPill tone="blue">Shadow-only</StatusPill></div>
            <p className="hero-sub">Live traffic is served and decided by the PHP Gateway. Agent config below is evidence of what has been synced, not an enforcement control.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>Runtime source</span><b>PHP Gateway</b></div>
          <div className="hero-stat"><span>Enforcement</span><b>None</b></div>
          <div className="hero-stat"><span>Agents registered</span><b>{agents.length}</b></div>
          <div className="hero-stat"><span>Selected agent config</span><b>{selectedAgent ? (dirty ? "Draft differs" : "In sync") : "—"}</b></div>
        </div>
      </div>

      <SectionCard title="Select agent"><AgentSelector agents={agents} selectedAgentId={selectedAgent} basePath="/gateway" /></SectionCard>

      {selectedAgent ? <>
        <div className="grid kpis" style={{ marginTop: 14 }}>
          <KpiCard title="Agent" value={<span className="mono">{selectedAgent}</span>} icon="◉" />
          <KpiCard title="Active version" value={valueOrDash(activeRecord.version)} icon="▣" />
          <KpiCard title="Draft version" value={valueOrDash(draftRecord.version)} icon="□" />
          <KpiCard title="Dirty" value={<StatusPill value={dirty} />} icon="!" tone={dirty ? "warning" : "success"} />
        </div>
        <div className="grid two" style={{ marginTop: 14 }}>
          <SectionCard title="Active config" description="Currently acknowledged configuration for this agent."><RawJsonDrawer data={activeConfig} title="Active config JSON" /></SectionCard>
          <SectionCard title="Draft diff" description="Pending differences between active and draft, if any."><RawJsonDrawer data={read(diffResult!)?.diff || diffResult} title="Diff JSON" /></SectionCard>
        </div>

        {hasAnyConfigWrite && (
          <SectionCard
            title="Config workflow"
            description="Validate, publish, or rollback the agent config. All actions are shadow-only and do not affect live PHP Gateway traffic. Every action is recorded in the audit trail."
          >
            <div className="readonly-banner" style={{ borderColor: "var(--info, #1565c0)", background: "var(--info-bg, #e3f2fd)", marginBottom: 16 }}>
              <span>▣</span>
              <span><b>Shadow-only mode.</b> These operations update what Mother has stored for this agent. PHP Gateway continues to serve live traffic independently — no config action here changes live enforcement.</span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {canValidate && (
                <form action={validateDraftAction} style={{ margin: 0 }}>
                  <input type="hidden" name="agent_id" value={selectedAgent} />
                  <button type="submit" className="button-secondary">
                    Validate draft
                  </button>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 240 }}>
                    Checks the current draft config against Mother's validation rules. No config change.
                  </p>
                </form>
              )}

              {canPublish && (
                <div>
                  <a
                    className="button-link"
                    href={`/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=publish`}
                  >
                    Publish draft →
                  </a>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, maxWidth: 240 }}>
                    Promotes the current draft to active config. Requires confirmation. Recorded in audit trail.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Config versions" description="History of published configuration versions.">
          {versions.length ? (
            <DataTable>
              <thead><tr>
                <th>Version</th>
                <th>Status</th>
                <th>Hash</th>
                <th>Published</th>
                <th>Source</th>
                {canRollback && <th>Actions</th>}
              </tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={`${v.version}-${v.config_hash}`}>
                    <td>{valueOrDash(v.version)}</td>
                    <td><StatusPill value={v.status || "unknown"} /></td>
                    <td className="mono">{valueOrDash(v.config_hash)}</td>
                    <td className="mono">{valueOrDash(v.published_at)}</td>
                    <td>{valueOrDash(v.source)}</td>
                    {canRollback && (
                      <td>
                        {v.version != null ? (
                          <a href={`/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=rollback&version=${v.version}`}>
                            Rollback to this
                          </a>
                        ) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : <EmptyState title="No config versions" />}
        </SectionCard>
      </> : agentsResult.ok ? <EmptyState title="No agent selected" description="Register an Agent first, then return to this page." /> : <ErrorState error={agentsResult.error} />}

      <SectionCard title="Safety model" description="What this page can and cannot do.">
        <div className="checklist-cards">
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">The PHP Gateway remains the authoritative runtime — it serves and decides live traffic.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Agents operate in shadow-only mode: they compare and report, they never enforce.</span></div>
          <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Config shown here reflects what Mother has stored, not a live control switch.</span></div>
          {hasAnyConfigWrite ? <>
            <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Validate, publish, and rollback actions are available to your role. They operate on Mother's stored config only — not live traffic.</span></div>
            <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Every config action requires permission checked inside the server action, not only at page load.</span></div>
            <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Publish and rollback require explicit confirmation before executing.</span></div>
            <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">Every attempt — success or failure — is appended to the audit trail.</span></div>
          </> : (
            <div className="checklist-card"><span className="checklist-card-icon">✓</span><span className="checklist-card-text">No write, publish, or rollback action is available to your current role on this page.</span></div>
          )}
        </div>
      </SectionCard>
    </>
  );
}
