import type { Permission } from "../lib/rbac";

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

export function Sidebar({ permissions, username, role }: { permissions: readonly string[]; username?: string; role?: string }) {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark">U</div>
        <div className="brand-text"><div className="brand-title">Unixsee</div><div className="brand-subtitle">Gateway Control</div></div>
      </div>
      <div className="sidebar-card"><b>Controlled Beta</b><br />PHP Gateway remains the runtime source. Agents stay shadow-only.</div>
      <nav className="nav" aria-label="Dashboard navigation">
        {items.filter((item) => permissions.includes(item.permission)).map((item) => <a href={item.href} key={item.href} data-icon={item.icon}>{item.label}</a>)}
      </nav>
      <div className="sidebar-footer">
        <span className="session-chip">Signed in as <b>{username || "auth-disabled"}</b><br />Role: <b>{role || "owner"}</b></span>
        <a className="logout-link" href="/logout">Sign out</a>
      </div>
    </aside>
  );
}
