"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="adm-card" role="alert">
      <div className="adm-empty">
        <span className="adm-empty-icon" aria-hidden><TriangleAlert /></span>
        <h1 className="adm-title" style={{ fontSize: 28 }}>Cette page n&apos;a pas pu s&apos;afficher.</h1>
        <p>Un incident temporaire (connexion à la base de données, réseau…) a interrompu le chargement. Vos données ne sont pas perdues : réessayez dans un instant.</p>
        {error.digest && <p className="adm-muted" style={{ fontSize: 13 }}>Référence technique : <span className="adm-code">{error.digest}</span></p>}
        <div className="adm-header-actions" style={{ justifyContent: "center", marginTop: 12 }}>
          <button type="button" className="adm-btn adm-btn--primary" disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}>
            {pending ? <LoaderCircle className="adm-spin" aria-hidden /> : <RefreshCw aria-hidden />} Réessayer
          </button>
          <Link className="adm-btn adm-btn--secondary" href="/admin"><LayoutDashboard aria-hidden /> Tableau de bord</Link>
        </div>
      </div>
    </div>
  );
}
