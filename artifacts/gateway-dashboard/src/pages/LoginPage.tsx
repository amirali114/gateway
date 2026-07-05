import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(username, password);
    setSubmitting(false);
    if (result.ok) {
      setLocation("/");
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-mark">&#9670;</div>
          <div className="login-logo">Unixsee Gateway</div>
        </div>
        <h1>Sign in</h1>
        <p>Access the Mother-backed control plane. The dashboard is local-only and reads Mother through the server.</p>
        {error ? <div className="login-error">{error}</div> : null}
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Username</span>
            <input
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="login-footnote">
          <span>&#9670;</span>
          <small>Session cookies are httpOnly, SameSite=Lax, and secure when the request context is HTTPS. This dashboard never fetches Mother directly from the browser.</small>
        </div>
      </section>
    </main>
  );
}
