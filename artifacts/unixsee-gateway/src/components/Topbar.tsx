import { Bell, Search, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  alertCount?: number;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, alertCount = 0, actions }: TopbarProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center gap-4 px-5 shrink-0 sticky top-0 z-10">
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-bold truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="hidden md:flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground w-52">
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>جستجو…</span>
        <span className="ltr text-[10px] bg-border/60 px-1.5 py-0.5 rounded mr-auto">⌘K</span>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      <button
        onClick={handleRefresh}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="بروزرسانی"
      >
        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
      </button>

      <Link
        href="/alerts"
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {alertCount > 0 && (
          <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Link>

      <div className="ltr text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
        PROD
      </div>
    </header>
  );
}
