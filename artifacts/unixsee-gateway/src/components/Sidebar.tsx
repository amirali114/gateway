import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Bot, Rocket, Network, Stethoscope,
  Globe, Shield, Bell, Users, ClipboardList, Settings,
  ChevronLeft, Zap, LogOut
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "داشبورد" },
  { href: "/agents", icon: Bot, label: "عاملان" },
  { href: "/release", icon: Rocket, label: "انتشار" },
  { href: "/mother", icon: Network, label: "مادر" },
  { href: "/diagnostics", icon: Stethoscope, label: "تشخیص" },
  { href: "/gateway", icon: Globe, label: "دروازه" },
  { href: "/policy", icon: Shield, label: "سیاست" },
  { href: "/alerts", icon: Bell, label: "هشدارها" },
  { href: "/users", icon: Users, label: "کاربران" },
  { href: "/audit", icon: ClipboardList, label: "حسابرسی" },
  { href: "/settings", icon: Settings, label: "تنظیمات" },
];

interface SidebarProps {
  alertCount?: number;
}

export function Sidebar({ alertCount = 0 }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-sidebar border-l border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-bold tracking-tight">Unixsee</span>
          <span className="text-[10px] text-muted-foreground ltr">Gateway Control</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col gap-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group relative",
                  active
                    ? "bg-sidebar-accent text-primary sidebar-item-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="flex-1">{label}</span>
                {href === "/alerts" && alertCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ltr">
                    {alertCount}
                  </span>
                )}
                {active && <ChevronLeft className="w-3 h-3 text-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>تنظیمات</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:bg-sidebar-accent/50 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>خروج</span>
        </Link>
        <div className="px-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">ع</div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate">علی حسینی</p>
              <p className="ltr text-[10px] text-muted-foreground truncate">admin</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
