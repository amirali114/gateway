import type { ReactNode } from "react";

export function EmptyState({ title, description, icon, tone = "neutral" }: { title: string; description?: string; icon?: ReactNode; tone?: "neutral" | "info" }) {
  return (
    <div className={tone === "info" ? "empty-state empty-state-info" : "empty-state"}>
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <div><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>
    </div>
  );
}
