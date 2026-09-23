import type { ReactNode } from "react";

/** Information d'entreprise encore inconnue, à fournir par le propriétaire. */
export function Todo({ children = "À compléter" }: { children?: ReactNode }) {
  return <mark className="todo">[{children}]</mark>;
}

export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-shell legal-page">
      <header className="page-intro compact">
        <p className="eyebrow">Informations légales</p>
        <h1>{title}</h1>
        <p className="legal-updated">Dernière mise à jour : {updated}</p>
        {intro ? <p className="page-lede">{intro}</p> : null}
      </header>
      <div className="legal-body">{children}</div>
    </div>
  );
}
