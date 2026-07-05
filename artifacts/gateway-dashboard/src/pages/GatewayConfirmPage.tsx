import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { apiGet, apiPost, read, valueOrDash, asRecord } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { MotherConfigResponse, MotherConfigVersionsResponse } from "@/lib/types";
import { useEffect } from "react";

export default function GatewayConfirmPage({ params }: { params: { agent_id: string } }) {
  const agentId = decodeURIComponent(params.agent_id);
  const search = useSearch();
  const sp = new URLSearchParams(search);
  const action = sp.get("action");
  const versionParam = (sp.get("version") || "").trim();
  const [, setLocation] = useLocation();
  const { hasPermission, auth } = useAuth();
  const queryClient = useQueryClient();

  const safeAction = action === "publish" ? "publish" : action === "rollback" ? "rollback" : null;
  const requiredPermission = safeAction === "publish" ? "gateway.config.publish" : "gateway.config.rollback";

  useEffect(() => {
    if (!safeAction) {
      setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}`);
    }
  }, [safeAction, agentId, setLocation]);

  let targetVersion: number | null = null;
  if (safeAction === "rollback") {
    const parsed = parseInt(versionParam, 10);
    if (!versionParam || isNaN(parsed) || parsed < 1 || String(parsed) !== versionParam) {
      // In a client component, we'd ideally use useEffect for this too
      setTimeout(() => setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&error=invalid_version`), 0);
    } else {
      targetVersion = parsed;
    }
  }

  const { data: cfgResult, isLoading: loadingCfg } = useQuery({
    queryKey: ["mother", "agents", agentId, "config"],
    queryFn: () => apiGet<MotherConfigResponse>(`mother/agents/${encodeURIComponent(agentId)}/config`),
    enabled: !!agentId,
  });

  const { data: versionsResult, isLoading: loadingVersions } = useQuery({
    queryKey: ["mother", "agents", agentId, "versions"],
    queryFn: () => apiGet<MotherConfigVersionsResponse>(`mother/agents/${encodeURIComponent(agentId)}/config/versions`),
    enabled: !!agentId && safeAction === "rollback",
  });

  const mutation = useMutation({
    mutationFn: async ({ note }: { note: string }) => {
      if (safeAction === "publish") {
        return apiPost(`mother/agents/${encodeURIComponent(agentId)}/config/publish`, { note });
      } else {
        return apiPost(`mother/agents/${encodeURIComponent(agentId)}/config/rollback`, { target_version: targetVersion, note });
      }
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["mother", "agents", agentId] });
        setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&ok=${safeAction === "publish" ? "published" : "rolled_back"}`);
      } else {
        setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&error=${safeAction === "publish" ? "publish_failed" : "rollback_failed"}`);
      }
    },
  });

  if (!hasPermission(requiredPermission)) {
    return <ErrorState title="Access Denied" error={`You do not have permission to ${safeAction || "operate"} gateway config.`} />;
  }

  if (!safeAction) return null;

  const cfg = cfgResult ? read(cfgResult) : undefined;
  const activeRecord = asRecord(cfg?.active_config);
  const draftRecord = asRecord(cfg?.draft_config);
  const versionsList = versionsResult ? read(versionsResult)?.versions || [] : [];
  const targetVersionRecord = targetVersion !== null ? versionsList.find((v) => v.version === targetVersion) ?? null : null;

  const actionLabel = safeAction === "publish" ? "Publish draft" : `Rollback to version ${targetVersion}`;
  const actionDesc = safeAction === "publish"
    ? "Publishing promotes the current draft config to the active config for this agent. This is a shadow-only operation — it does not affect live PHP Gateway traffic."
    : `Rolling back replaces the active config with version ${targetVersion}. This is a shadow-only operation — it does not affect live PHP Gateway traffic.`;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const note = String(formData.get("note") || "").trim().slice(0, 240);
    mutation.mutate({ note });
  };

  return (
    <>
      <PageHeader
        eyebrow="Gateway — confirmation required"
        title={`Confirm: ${actionLabel}`}
        description={actionDesc}
        actions={
          <button className="button-link button-secondary" onClick={() => setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}`)}>
            Cancel — back to gateway
          </button>
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
        {loadingCfg ? (
          <p>Loading config state...</p>
        ) : !cfg ? (
          <ErrorState
            title="Config unavailable"
            error={cfgResult && !cfgResult.ok ? cfgResult.error : "Mother returned an empty config payload."}
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
          {loadingVersions ? (
            <p>Loading version details...</p>
          ) : !targetVersionRecord ? (
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
        <form onSubmit={handleSubmit} className="stack-form">
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
                Actor: <b>{auth?.username}</b> ({auth?.role}) — recorded in audit trail
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
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Confirming..." : `Confirm — ${actionLabel}`}
            </button>
            <button type="button" className="button-secondary" onClick={() => setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}`)}>
              Cancel
            </button>
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
