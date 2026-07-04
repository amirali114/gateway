"use server";

import { redirect } from "next/navigation";
import { setDashboardSession, verifyDashboardPassword } from "../../lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const user = await verifyDashboardPassword(username, password);
  if (!user) redirect("/login?error=1");
  await setDashboardSession(user);
  redirect("/");
}
