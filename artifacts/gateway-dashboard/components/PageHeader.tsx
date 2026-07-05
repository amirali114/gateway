import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions, meta }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {meta ? <div className="page-meta">{meta}</div> : null}
        </div>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
