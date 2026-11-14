import type { ReactNode } from "react";

/** A bordered surface. Elevation from border and background step, not shadow. */
export function Panel({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={`panel ${className ?? ""}`}>
      {children}
    </section>
  );
}

/** A card heading in sentence case (DESIGN.md: Heading), with an optional note. */
export function PanelHeader({ title, note, actions }: { title: string; note?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="panel__header">
      <h2 className="panel__title">{title}</h2>
      <div className="panel__spacer" />
      {note && <span className="panel__note">{note}</span>}
      {actions}
    </header>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`panel__body ${className ?? ""}`}>{children}</div>;
}
