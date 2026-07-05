import type { ReactNode } from "react";

export function SectionCard({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div><h2 className="section-title">{title}</h2>{description ? <p className="section-description">{description}</p> : null}</div>
        {action ? <div className="section-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
