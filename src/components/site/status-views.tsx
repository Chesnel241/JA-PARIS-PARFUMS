"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Contenu de la page 404 (utilisable côté serveur comme client). */
export function NotFoundView() {
  return (
    <section className="status-page" aria-labelledby="status-title">
      <div>
        <p className="status-code" aria-hidden>404</p>
        <h1 id="status-title">Cette page est introuvable</h1>
        <p>Elle a peut-être été déplacée, ou n’existe plus.</p>
        <div className="status-actions">
          <Link className="primary-button" href="/">Retour à l’accueil</Link>
          <Link className="primary-button ghost" href="/boutique">Voir les parfums</Link>
        </div>
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
    <section className="status-page" aria-labelledby="status-title">
      <div>
        <p className="status-code" aria-hidden>Oups</p>
        <h1 id="status-title">Une erreur est survenue</h1>
        {/* error.message n'est pas affiché : texte technique, inutile pour le client. */}
        <p>Un incident temporaire empêche l’affichage de cette page. Réessayez dans un instant.</p>
        <div className="status-actions">
          <button type="button" className="primary-button" onClick={() => reset()}>Réessayer</button>
          <Link className="primary-button ghost" href="/">Retour à l’accueil</Link>
        </div>
        {error.digest ? <p className="status-ref">Référence : {error.digest}</p> : null}
      </div>
    </section>
  );
}
