import type { ReactNode } from "react";

/** Information d'entreprise encore inconnue, à fournir par le propriétaire. */
export function Todo({ children = "À compléter" }: { children?: ReactNode }) {
  return <mark className="todo">[{children}]</mark>;
}

export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="wrap page-head is-compact">
        <div>
          <span className="tag">Informations · mise à jour le {updated}</span>
          <h1 className="h-xl">{title}</h1>
        </div>
        {intro ? <p className="lead">{intro}</p> : null}
      </header>
      <div className="wrap">
        <div className="legal legal-corps">{children}</div>
      </div>
    </>
  );
}
