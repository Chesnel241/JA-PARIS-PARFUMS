import type { ReactNode } from "react";

/** En-tête des pages intérieures : pastille, très grand titre, une phrase. */
export function PageHead({ tag, dot = false, title, lead, compact = false, children }: {
  tag?: string;
  dot?: boolean;
  title: ReactNode;
  lead?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={`wrap page-head${compact ? " is-compact" : ""}`}>
      <div>
        {children}
        {tag ? <span className="tag">{dot ? <span className="dot" /> : null}{tag}</span> : null}
        <h1 className="h-xl">{title}</h1>
      </div>
      {lead ? <p className="lead">{lead}</p> : null}
    </header>
  );
}
