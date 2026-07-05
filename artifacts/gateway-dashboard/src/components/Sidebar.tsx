import { Link, useLocation } from "wouter";
import type { Permission } from "@/lib/rbac";

const items: { href: string; label: string; permission: Permission; icon: string }[] = [
  { href: "/", label: "Dashboard", permission: "dashboard.view", icon: "▦" },
  { href: "/agents", label: "Agents", permission: "agents.view", icon: "◉" },
  { href: "/sync", label: "Sync", permission: "agents.view", icon: "⇄" },
  { href: "/release", label: "Release", permission: "release.view", icon: "◇" },
  { href: "/mother", label: "Mother", permission: "settings.view", icon: "◎" },
  { href: "/diagnostics", label: "Diagnostics", permission: "diagnostics.view", icon: "⌁" },
  { href: "/gateway", label: "Gateway", permission: "gateway.view", icon: "⌘" },
  { href: "/policy", label: "Policy", permission: "policy.view", icon: "□" },
  { href: "/alerts", label: "Alerts", permission: "alerts.view", icon: "!" },
  { href: "/users", label: "Users", permission: "users.view", icon: "♙" },
  { href: "/audit", label: "Audit Trail", permission: "audit.view", icon: "⌕" },
  { href: "/settings", label: "Settings", permission: "settings.view", icon: "⚙" },
  { href: "/settings/production", label: "Production", permission: "settings.view", icon: "✓" }
];

export function Sidebar({ permissions, username, role, onLogout }: { permissions: readonly string[]; username?: string; role?: string; onLogout?: () => void }) {
  const [location] = useLocation();

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark">U</div>
        <div className="brand-text"><div className="brand-title">Unixsee</div><div className="brand-subtitle">Gateway Control</div></div>
      </div>
      <div className="sidebar-card"><b>Controlled Beta</b><br />PHP Gateway remains the runtime source. Agents stay shadow-only.</div>
      <nav className="nav" aria-label="Dashboard navigation">
        {items.filter((item) => permissions.includes(item.permission)).map((item) => {
          const active = location === item.href;
          return (
            <Link href={item.href} key={item.href} data-icon={item.icon} className={active ? "active" : ""}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="session-chip">Signed in as <b>{username || "auth-disabled"}</b><br />Role: <b>{role || "owner"}</b></span>
        <button className="logout-link" onClick={onLogout} style={{ width: "100%", background: "none", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
