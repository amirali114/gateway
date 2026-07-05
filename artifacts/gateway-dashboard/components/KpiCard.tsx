import type { ReactNode } from "react";
import type { PillTone } from "./StatusPill";

export function KpiCard({ title, value, hint, icon = "•", tone = "neutral" }: { title: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: PillTone }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-head"><span>{title}</span><span className="kpi-icon">{icon}</span></div>
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </article>
  );
}
