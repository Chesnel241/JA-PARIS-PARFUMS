"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/maison/icons";

/** Contenu de la page 404 (utilisable côté serveur comme client). */
export function NotFoundView() {
  return (
    <section className="wrap statut" aria-labelledby="status-title">
      <p className="code tab" aria-hidden="true">404</p>
      <h1 id="status-title" className="h-lg">Cette page n’a pas <span className="serif">d’heure.</span></h1>
      <p className="lead">Elle a peut-être été déplacée, ou n’existe plus. Les parfums, eux, sont toujours là.</p>
      <div className="btn-row">
        <Link className="btn" href="/">Retour à l’accueil<span className="ico"><ArrowIcon /></span></Link>
        <Link className="btn btn-line" href="/boutique">Voir les parfums</Link>
      </div>
    </section>
  );
}

/** Contenu des pages d'erreur (error.tsx). */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="wrap statut" aria-labelledby="status-title">
      <p className="code" aria-hidden="true">Oups</p>
      <h1 id="status-title" className="h-lg">Une erreur est <span className="serif">survenue.</span></h1>
      {/* error.message n'est pas affiché : texte technique, inutile pour le client. */}
      <p className="lead">Un incident temporaire empêche l’affichage de cette page. Réessayez dans un instant.</p>
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => reset()}>Réessayer</button>
        <Link className="btn btn-line" href="/">Retour à l’accueil</Link>
      </div>
      {error.digest ? <p className="ref">Référence : {error.digest}</p> : null}
    </section>
  );
}
