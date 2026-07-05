import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth-constants";

const PUBLIC_PREFIXES = ["/_next", "/favicon.ico", "/login", "/logout"];

function publicBaseUrl(): string {
  return (process.env.DASHBOARD_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}

function redirectToLogin(req: NextRequest) {
  const base = publicBaseUrl();
  if (base) {
    return NextResponse.redirect(new URL("/login", base));
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  if ((process.env.DASHBOARD_AUTH_ENABLED || "true").toLowerCase() === "false") return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return NextResponse.next();
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return redirectToLogin(req);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api).*)"] };
