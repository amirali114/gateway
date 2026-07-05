import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { AgentSelector } from "@/components/AgentSelector";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RawJsonDrawer } from "@/components/RawJsonDrawer";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { asRecord, apiGet, apiPost, read, valueOrDash } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { MotherAgentsResponse, MotherConfigResponse, MotherConfigDiffResponse, MotherConfigVersionsResponse, MotherConfigValidationResponse } from "@/lib/types";

function configFrom(record: unknown) { const r = asRecord(record); return asRecord(r.config); }

const KNOWN_VALIDATE_OK = new Set(["valid"]);
const KNOWN_VALIDATE_ERROR = new Set(["draft_unavailable", "validate_request_failed", "validation_failed"]);
const KNOWN_OK = new Set(["published", "rolled_back"]);
const KNOWN_ERROR = new Set(["missing_agent_id", "publish_failed", "rollback_failed", "invalid_version"]);

export default function GatewayPage() {
  const { hasPermission } = useAuth();
  const search = useSearch();
  const sp = new URLSearchParams(search);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const agentIdParam = sp.get("agent_id");
  const validateOkParam = sp.get("validate_ok");
  const validateErrorParam = sp.get("validate_error");
  const okParam = sp.get("ok");
  const errorParam = sp.get("error");

  const safeValidateOk = validateOkParam && KNOWN_VALIDATE_OK.has(validateOkParam) ? validateOkParam : null;
  const safeValidateError = validateErrorParam && KNOWN_VALIDATE_ERROR.has(validateErrorParam) ? validateErrorParam : null;
  const safeOk = okParam && KNOWN_OK.has(okParam) ? okParam : null;
  const safeError = errorParam && KNOWN_ERROR.has(errorParam) ? errorParam : null;

  const canView = hasPermission("gateway.view");
  const canValidate = hasPermission("gateway.config.validate");
  const canPublish = hasPermission("gateway.config.publish");
  const canRollback = hasPermission("gateway.config.rollback");
  const hasAnyConfigWrite = canValidate || canPublish || canRollback;

  const { data: agentsResult } = useQuery({
    queryKey: ["mother", "agents"],
    queryFn: () => apiGet<MotherAgentsResponse>("mother/agents"),
  });

  const agents = read(agentsResult!)?.agents || [];
  const selectedAgent = agentIdParam || agents[0]?.agent_id || "";

  const { data: cfgResult } = useQuery({
    queryKey: ["mother", "agents", selectedAgent, "config"],
    queryFn: () => apiGet<MotherConfigResponse>(`mother/agents/${encodeURIComponent(selectedAgent)}/config`),
    enabled: !!selectedAgent,
  });

  const { data: diffResult } = useQuery({
    queryKey: ["mother", "agents", selectedAgent, "diff"],
    queryFn: () => apiGet<MotherConfigDiffResponse>(`mother/agents/${encodeURIComponent(selectedAgent)}/config/diff`),
    enabled: !!selectedAgent,
  });

  const { data: versionsResult } = useQuery({
    queryKey: ["mother", "agents", selectedAgent, "versions"],
    queryFn: () => apiGet<MotherConfigVersionsResponse>(`mother/agents/${encodeURIComponent(selectedAgent)}/config/versions`),
    enabled: !!selectedAgent,
  });

  const validateMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiPost<MotherConfigValidationResponse>(`mother/agents/${encodeURIComponent(agentId)}/config/validate`, {});
    },
    onSuccess: (result, agentId) => {
      if (!result.ok) {
        setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validate_request_failed`);
        return;
      }
      const valid = read(result)?.validation?.valid;
      if (!valid) {
        setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_error=validation_failed`);
      } else {
        setLocation(`/gateway?agent_id=${encodeURIComponent(agentId)}&validate_ok=valid`);
      }
    },
  });

  if (!canView) {
    return <ErrorState title="Access Denied" error="You do not have permission to view Gateway control." />;
  }

  const activeRecord = asRecord(read(cfgResult!)?.active_config);
  const draftRecord = asRecord(read(cfgResult!)?.draft_config);
  const activeConfig = configFrom(activeRecord);
  const versions = read(versionsResult!)?.versions || [];
  const diff = read(diffResult!)?.diff;
  const dirty = Boolean(diff?.dirty);

  const bannerSuffix = hasAnyConfigWrite
    ? "Agents run in shadow-only mode — they observe and compare, they do not enforce. Config validate, publish, and rollback controls are available below for authorised roles. These actions do not change live traffic."
    : "Agents run in shadow-only mode — they observe and compare, they do not enforce. This page only reflects what Mother has stored; no write, publish, or rollback action is available to your current role.";

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
        <span><b>PHP Gateway is the runtime source of truth.</b> {bannerSuffix}</span>
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
            {safeError === "invalid_version" && "The requested rollback version was invalid or not found."}
          </span>
        </div>
      )}

      {safeValidateOk && (
        <div className="readonly-banner" style={{ borderColor: "var(--success, #2e7d32)", background: "var(--success-bg, #e8f5e9)" }}>
          <span>✓</span>
          <span><b>Validation passed.</b> The current draft config is syntactically and structurally valid for this agent.</span>
        </div>
      )}

      {safeValidateError && (
        <div className="readonly-banner" style={{ borderColor: "var(--danger, #c62828)", background: "var(--danger-bg, #fdecea)" }}>
          <span>✗</span>
          <span>
            <b>Validation failed.</b>{" "}
            {safeValidateError === "draft_unavailable" && "Mother could not retrieve the draft config for this agent."}
            {safeValidateError === "validate_request_failed" && "The validation request to Mother failed. Check Mother's connectivity."}
            {safeValidateError === "validation_failed" && "The draft config failed Mother's structural validation. Review the draft JSON."}
          </span>
        </div>
      )}

      <div className="section-block">
        <SectionCard title="Agent selection" description="Select an agent to view and manage its control-plane configuration.">
          <AgentSelector
            agents={agents}
            selectedAgentId={selectedAgent}
          />
        </SectionCard>
      </div>

      {!selectedAgent ? (
        <div className="section-block">
          <EmptyState
            tone="info"
            icon="▣"
            title="No agent selected"
            description="Select an agent from the registry above to manage its Gateway configuration."
          />
        </div>
      ) : (
        <>
          <div className="grid kpis">
            <KpiCard title="Active version" value={valueOrDash(activeRecord.version)} hint={valueOrDash(activeRecord.config_hash)} icon="▣" tone="blue" />
            <KpiCard title="Draft version" value={valueOrDash(draftRecord.version)} hint={valueOrDash(draftRecord.config_hash)} icon="▩" />
            <KpiCard title="Sync status" value={<StatusPill value={activeRecord.status || "unknown"} />} icon="↻" />
            <KpiCard title="Pending changes" value={dirty ? "Yes" : "No"} tone={dirty ? "warning" : "success"} icon="!" />
          </div>

          <div className="grid two section-block">
            <SectionCard
              title="Active config"
              description="The configuration currently promoted to active in Mother for this agent."
              action={activeRecord.version ? <StatusPill value="Active" /> : null}
            >
              <RawJsonDrawer data={activeConfig} title="Active Config JSON" />
            </SectionCard>
            <SectionCard
              title="Draft config"
              description="The pending configuration in Mother. Only promoted to active upon publication."
              action={dirty ? <StatusPill tone="warning">Modified</StatusPill> : <StatusPill tone="neutral">No changes</StatusPill>}
            >
              <RawJsonDrawer data={configFrom(draftRecord)} title="Draft Config JSON" />
              {dirty && hasAnyConfigWrite && (
                <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                  {canValidate && (
                    <button
                      className="button-secondary"
                      onClick={() => validateMutation.mutate(selectedAgent)}
                      disabled={validateMutation.isPending}
                    >
                      {validateMutation.isPending ? "Validating..." : "Validate draft"}
                    </button>
                  )}
                  {canPublish && (
                    <Link
                      className="button"
                      href={`/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=publish`}
                    >
                      Publish draft
                    </Link>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="section-block">
            <SectionCard title="Config history" description="Read-only version history for this agent. Rollback is available for authorized roles.">
              {versions.length ? (
                <DataTable>
                  <thead><tr><th>Version</th><th>Status</th><th>Published</th><th>Source</th><th>Hash</th><th>Note</th><th>Actions</th></tr></thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={`${v.version}-${v.config_hash}`}>
                        <td>{valueOrDash(v.version)}</td>
                        <td><StatusPill value={v.status || "unknown"} /></td>
                        <td className="mono">{valueOrDash(v.published_at)}</td>
                        <td>{valueOrDash(v.source)}</td>
                        <td className="mono">{valueOrDash(v.config_hash)}</td>
                        <td>{valueOrDash(v.note)}</td>
                        <td>
                          {canRollback && v.version !== activeRecord.version && (
                            <Link
                              className="button-link button-secondary small"
                              href={`/gateway/${encodeURIComponent(selectedAgent)}/confirm?action=rollback&version=${v.version}`}
                            >
                              Rollback
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <EmptyState title="No history found" />
              )}
            </SectionCard>
          </div>

          <RawJsonDrawer data={{ cfgResult, diffResult, versionsResult }} title="Raw gateway payloads" />
        </>
      )}
    </>
  );
}
