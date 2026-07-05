import { Router, type IRouter } from "express";
import { motherActorHeaders, requirePermission, type AuthStatus } from "../lib/auth";
import { encodePathPart, postMotherJson, safeFetchJson } from "../lib/mother-api";
import { appendAudit } from "../lib/user-store";
import type { Role } from "../lib/rbac";

function auditActor(auth: AuthStatus) {
  if (auth.role === "auth-disabled") return undefined;
  return { id: auth.user_id, username: auth.username, role: auth.role as Role };
}

const router: IRouter = Router();

function agentId(req: import("express").Request): string {
  const raw = Array.isArray(req.params.agent_id) ? req.params.agent_id[0] : req.params.agent_id;
  return String(raw || "");
}

router.get("/mother/health", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "dashboard.view");
  if (!auth) return;
  res.json(await safeFetchJson("/healthz"));
});

router.get("/mother/ready", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "dashboard.view");
  if (!auth) return;
  res.json(await safeFetchJson("/readyz"));
});

router.get("/mother/health-report", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "dashboard.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/health/report"));
});

router.get("/mother/storage-status", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "settings.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/storage/status"));
});

router.get("/mother/policies", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "policy.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/policies"));
});

router.get("/mother/policies/:policy_id", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "policy.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/policies/${encodePathPart(String(req.params.policy_id))}`));
});

router.get("/mother/agents", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "agents.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/agents"));
});

router.get("/mother/agents/:agent_id", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "agents.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}`));
});

router.get("/mother/agents/:agent_id/telemetry", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "diagnostics.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/telemetry`));
});

router.get("/mother/agents/:agent_id/diagnostics", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "diagnostics.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/diagnostics`));
});

router.get("/mother/agents/:agent_id/events", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "diagnostics.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/events`));
});

router.get("/mother/agents/:agent_id/policy-assignment", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "agents.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/policy-assignment`));
});

router.get("/mother/agents/:agent_id/control-plane", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/control-plane`));
});

router.get("/mother/agents/:agent_id/config", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config`));
});

router.get("/mother/agents/:agent_id/config/history", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config/history`));
});

router.get("/mother/agents/:agent_id/config/draft", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config/draft`));
});

router.get("/mother/agents/:agent_id/config/active", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config/active`));
});

router.get("/mother/agents/:agent_id/config/diff", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config/diff`));
});

router.get("/mother/agents/:agent_id/config/versions", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/agents/${encodePathPart(agentId(req))}/config/versions`));
});

router.post("/mother/agents/:agent_id/config/validate", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.config.validate");
  if (!auth) return;
  const id = agentId(req);
  const result = await postMotherJson(`/v1/agents/${encodePathPart(id)}/config/validate`, { config: req.body?.config }, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "config.validate", target_type: "agent", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

router.post("/mother/agents/:agent_id/config/publish", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.config.publish");
  if (!auth) return;
  const id = agentId(req);
  const result = await postMotherJson(`/v1/agents/${encodePathPart(id)}/config/publish`, { note: req.body?.note }, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "config.publish", target_type: "agent", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

router.post("/mother/agents/:agent_id/config/rollback", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "gateway.config.rollback");
  if (!auth) return;
  const id = agentId(req);
  const result = await postMotherJson(`/v1/agents/${encodePathPart(id)}/config/rollback`, { target_version: req.body?.target_version, note: req.body?.note }, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "config.rollback", target_type: "agent", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

router.get("/mother/diagnostics/summary", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "diagnostics.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/diagnostics/summary"));
});

router.get("/mother/release-gates", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "release.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/release-gates"));
});

router.get("/mother/release-gates/summary", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "release.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/release-gates/summary"));
});

router.get("/mother/alerts", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.view");
  if (!auth) return;
  const q = new URLSearchParams();
  for (const key of ["status", "agent_id", "scope", "limit"]) {
    const value = req.query[key];
    if (typeof value === "string" && value) q.set(key, value);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  res.json(await safeFetchJson(`/v1/alerts${suffix}`));
});

router.get("/mother/alerts/summary", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.view");
  if (!auth) return;
  res.json(await safeFetchJson("/v1/alerts/summary"));
});

router.get("/mother/alerts/:alert_id", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.view");
  if (!auth) return;
  res.json(await safeFetchJson(`/v1/alerts/${encodePathPart(String(req.params.alert_id))}`));
});

router.post("/mother/alerts/evaluate", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.manage");
  if (!auth) return;
  res.json(await postMotherJson("/v1/alerts/evaluate", {}, undefined, motherActorHeaders(auth)));
});

router.post("/mother/alerts/:alert_id/resolve", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.manage");
  if (!auth) return;
  const id = String(req.params.alert_id);
  const result = await postMotherJson(`/v1/alerts/${encodePathPart(id)}/resolve`, {}, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "alert.resolve", target_type: "alert", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

router.post("/mother/alerts/:alert_id/mute", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.manage");
  if (!auth) return;
  const id = String(req.params.alert_id);
  const result = await postMotherJson(`/v1/alerts/${encodePathPart(id)}/mute`, {}, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "alert.mute", target_type: "alert", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

router.post("/mother/alerts/:alert_id/unmute", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "alerts.manage");
  if (!auth) return;
  const id = String(req.params.alert_id);
  const result = await postMotherJson(`/v1/alerts/${encodePathPart(id)}/unmute`, {}, undefined, motherActorHeaders(auth));
  await appendAudit({ actor: auditActor(auth), action: "alert.unmute", target_type: "alert", target_id: id, result: result.ok ? "success" : "failure", metadata: { mother_status: result.status } });
  res.json(result);
});

export default router;
