import type { ReactNode } from "react";
import { StatusPill } from "./StatusPill";

export function Topbar({ userLabel, actions }: { userLabel?: string; actions?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="env-pill">PROD</span>
        <span className="icon-button">●</span>
        <span className="icon-button">↻</span>
        <div className="search-box"><span>Search...</span><span>⌘K</span></div>
      </div>
      <div className="topbar-right">
        <StatusPill tone="blue">local-only</StatusPill>
        <StatusPill tone="success">shadow-only</StatusPill>
        {actions}
        <span className="small-muted">{userLabel}</span>
      </div>
    </header>
  );
}
