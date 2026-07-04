import type { ReactNode } from "react";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "blue" | "violet";

export function statusTone(value: unknown): PillTone {
  const text = String(value ?? "").toLowerCase();
  if (["ok", "ready", "online", "fresh", "pass", "healthy", "active", "success", "writable", "enabled", "true"].includes(text)) return "success";
  if (["warn", "warning", "stale", "skipped", "pending", "unknown", "needs_completion", "conditional"].includes(text)) return "warning";
  if (["fail", "failed", "error", "critical", "danger", "down", "unavailable", "blocked", "false"].includes(text)) return "danger";
  if (["shadow", "shadow-only", "local-only"].includes(text)) return "blue";
  return "neutral";
}

export function labelFor(value: unknown): string {
  if (value === true) return "Enabled";
  if (value === false) return "Disabled";
  const text = String(value ?? "").trim();
  const labels: Record<string, string> = {
    online: "Online",
    stale: "Stale",
    unknown: "Unknown",
    fresh: "Fresh",
    missing: "Missing",
    pass: "Pass",
    warn: "Warn",
    fail: "Fail",
    skipped: "Skipped",
    active: "Active",
    resolved: "Resolved",
    muted: "Muted",
    shadow: "Shadow",
    "shadow-only": "Shadow-only",
    local: "Local",
    json: "JSON",
    postgres: "PostgreSQL"
  };
  return labels[text] || text || "—";
}

export function StatusPill({ value, tone, children }: { value?: unknown; tone?: PillTone; children?: ReactNode }) {
  const raw = children ?? value;
  const resolved = tone || statusTone(raw);
  return <span className={`status-pill status-${resolved}`}>{children ?? labelFor(raw)}</span>;
}
