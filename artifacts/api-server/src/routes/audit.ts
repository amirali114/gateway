import { Router, type IRouter } from "express";
import { requirePermission } from "../lib/auth";
import { listAuditEvents } from "../lib/user-store";

const router: IRouter = Router();

router.get("/audit", async (req, res): Promise<void> => {
  const auth = await requirePermission(req, res, "audit.view");
  if (!auth) return;
  const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = limitRaw ? Math.min(1000, Math.max(1, parseInt(String(limitRaw), 10) || 250)) : 250;
  res.json({ ok: true, events: listAuditEvents(limit) });
});

export default router;
