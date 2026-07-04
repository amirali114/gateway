import { redirect } from "next/navigation";
import { loginAction } from "./actions";
import { currentSession, isAuthEnabled } from "../../lib/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (!isAuthEnabled()) redirect("/");
  const session = await currentSession();
  if (session) redirect("/");
  const sp = searchParams ? await searchParams : {};
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-mark">◈</div>
          <div className="login-logo">Unixsee Gateway</div>
        </div>
        <h1>Sign in</h1>
        <p>Access the Mother-backed control plane. The dashboard is local-only and reads Mother through the server.</p>
        {sp.error ? <div className="login-error">Invalid username or password.</div> : null}
        <form action={loginAction} className="login-form">
          <label><span>Username</span><input name="username" autoComplete="username" required /></label>
          <label><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
          <button type="submit">Sign in</button>
        </form>
        <div className="login-footnote">
          <span>◈</span>
          <small>Session cookies are httpOnly, SameSite=Lax, and secure when the request context is HTTPS. This dashboard never fetches Mother directly from the browser.</small>
        </div>
      </section>
    </main>
  );
}
