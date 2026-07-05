import type { ReactNode } from "react";

interface StatusCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "good" | "bad" | "warn" | "neutral";
}

export function StatusCard({ label, value, note, tone = "neutral" }: StatusCardProps) {
  const badgeClass = tone === "neutral" ? "badge" : `badge ${tone}`;
  return (
    <div className="status-card">
      <div className="card-label">{label}</div>
      <div className="card-value"><span className={badgeClass}>{value}</span></div>
      {note ? <div className="card-note">{note}</div> : null}
    </div>
  );
}
