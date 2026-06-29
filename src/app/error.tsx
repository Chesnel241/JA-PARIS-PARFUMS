"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell" style={{ textAlign: "center", paddingTop: 120 }}>
      <h1 style={{ font: "500 64px var(--font-display), serif" }}>Une erreur est survenue.</h1>
      <p style={{ color: "#6e665e", marginTop: 16 }}>{error.message}</p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 40 }}>
        <button onClick={() => reset()} className="primary-button">Réessayer</button>
        <Link href="/" className="primary-button" style={{ background: "transparent", color: "var(--ink)" }}>Retour à l’accueil</Link>
      </div>
    </div>
  );
}
