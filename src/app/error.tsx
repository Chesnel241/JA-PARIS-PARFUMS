"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell" style={{ textAlign: "center", paddingTop: 120, paddingBottom: 120 }}>
      <h1 style={{ font: "500 clamp(40px, 6vw, 64px) var(--font-display), serif", margin: 0 }}>Une erreur est survenue.</h1>
      {/* Ne pas afficher error.message : en production il contient un texte
          technique anglais de Next.js, inutile pour le client. */}
      <p style={{ color: "#6e665e", marginTop: 16, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
        Un incident temporaire nous empêche d&apos;afficher cette page. Réessayez dans un instant.
      </p>
      {error.digest && (
        <p style={{ color: "#a39a91", marginTop: 8, fontSize: 11 }}>Référence : {error.digest}</p>
      )}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
        <button onClick={() => reset()} className="primary-button">Réessayer</button>
        <Link href="/" className="primary-button" style={{ background: "transparent", color: "var(--ink)" }}>Retour à l’accueil</Link>
      </div>
    </div>
  );
}
