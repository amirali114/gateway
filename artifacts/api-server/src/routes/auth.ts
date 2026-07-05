import { Router, type IRouter } from "express";
import { appendAudit, safeUserForSession } from "../lib/user-store";
import { clearDashboardSession, currentSession, setDashboardSession, verifyDashboardPassword } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }
  const user = await verifyDashboardPassword(req, username, password);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  setDashboardSession(req, res, user);
  const session = user.id === "auth-disabled"
    ? { enabled: false, user_id: "auth-disabled", username: "auth-disabled", display_name: "auth-disabled", role: "auth-disabled" as const, permissions: currentSession(req)?.permissions ?? [] }
    : { enabled: true, ...safeUserForSession(user) };
  res.json({ ok: true, session });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const session = currentSession(req);
  if (session && session.enabled) {
    await appendAudit({ actor: { id: session.user_id, username: session.username, role: session.role as "owner" | "admin" | "operator" | "viewer" }, action: "logout", target_type: "session", target_id: session.username, result: "success" });
  }
  clearDashboardSession(req, res);
  res.json({ ok: true });
});

router.get("/session", (req, res): void => {
  const session = currentSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }
  res.json({ ok: true, session });
});

export default router;
