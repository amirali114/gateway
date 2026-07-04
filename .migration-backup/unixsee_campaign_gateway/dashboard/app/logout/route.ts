import { NextRequest, NextResponse } from "next/server";
import { clearDashboardSession, currentSession, dashboardPublicBaseUrl } from "../../lib/auth";
import { appendAudit } from "../../lib/user-store";

export async function GET(req: NextRequest) {
  const session = await currentSession();
  if (session) await appendAudit({ actor: { id: session.user_id, username: session.username, role: session.role as "owner" | "admin" | "operator" | "viewer" }, action: "logout", target_type: "session", target_id: session.username, result: "success" });
  await clearDashboardSession();
  const base = dashboardPublicBaseUrl();
  return NextResponse.redirect(new URL("/login", base || req.url));
}
