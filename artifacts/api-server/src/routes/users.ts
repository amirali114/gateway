import { Router, type IRouter } from "express";
import { currentSession, requirePermission } from "../lib/auth";
import { createUser, listUsers, resetUserPassword, updateUser } from "../lib/user-store";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "users.view");
  if (!auth) return;
  res.json({ ok: true, users: listUsers() });
});

router.post("/users", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "users.manage");
  if (!auth) return;
  try {
    const actor = auth.role === "auth-disabled" ? undefined : { id: auth.user_id, username: auth.username, role: auth.role };
    const user = await createUser(req.body, actor);
    res.status(201).json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create user." });
  }
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "users.manage");
  if (!auth) return;
  try {
    const actor = auth.role === "auth-disabled" ? undefined : { id: auth.user_id, username: auth.username, role: auth.role };
    const user = await updateUser(String(req.params.id), req.body, actor);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update user." });
  }
});

router.post("/users/:id/reset-password", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "users.manage");
  if (!auth) return;
  try {
    const actor = auth.role === "auth-disabled" ? undefined : { id: auth.user_id, username: auth.username, role: auth.role };
    await resetUserPassword(String(req.params.id), String(req.body?.password || ""), actor);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to reset password." });
  }
});

router.get("/settings/security", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "settings.view");
  if (!auth) return;
  const { dashboardSecuritySummary } = await import("../lib/auth");
  res.json({ ok: true, security: dashboardSecuritySummary(req) });
});

router.get("/me", (req, res): void => {
  const session = currentSession(req);
  res.json({ ok: true, session });
});

export default router;
