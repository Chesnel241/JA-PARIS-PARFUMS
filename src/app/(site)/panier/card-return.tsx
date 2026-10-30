"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CircleAlert, CreditCard, LoaderCircle } from "lucide-react";
import { formatPrice } from "@/lib/data";

// Écrans transitoires au retour de la page de paiement Stripe : vérification
// en cours, paiement non finalisé (reprendre ou revenir au panier), erreur.

export type CardReturnView =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "open"; reference: string; total: number; paymentUrl: string | null };

export function CardReturn({ view, busy, onRetry, onBackToCart }: {
  view: CardReturnView;
  busy?: boolean;
  onRetry: () => void;
  onBackToCart: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (view.kind !== "loading") headingRef.current?.focus({ preventScroll: true });
  }, [view.kind]);

  if (view.kind === "loading") {
    return (
      <div className="cm-confirm" aria-busy="true">
        <div className="cm-confirm__intro">
          <span className="cm-confirm__icon" aria-hidden="true"><LoaderCircle className="spin" /></span>
          <p className="eyebrow">Paiement par carte</p>
          <h1>Un instant…</h1>
          <p className="cm-confirm__lead" role="status">Nous vérifions votre paiement auprès de Stripe.</p>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="cm-confirm">
        <div className="cm-confirm__intro">
          <span className="cm-confirm__icon" aria-hidden="true"><CircleAlert /></span>
          <p className="eyebrow">Paiement par carte</p>
          <h1 ref={headingRef} tabIndex={-1}>Vérification impossible.</h1>
          <p className="cm-confirm__lead">
            Nous n’avons pas pu confirmer l’état de votre paiement pour le moment. Si vous avez été débité, votre commande est
            bien enregistrée et sera confirmée automatiquement : réessayez dans un instant.
          </p>
        </div>
        <div className="cm-confirm__actions">
          <button type="button" className="primary-button cm-block-button" onClick={onRetry} disabled={busy}>Vérifier à nouveau</button>
          <Link className="cm-text-button" href="/boutique">Continuer mes achats</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-confirm">
      <div className="cm-confirm__intro">
        <span className="cm-confirm__icon" aria-hidden="true"><CreditCard /></span>
        <p className="eyebrow">Commande {view.reference}</p>
        <h1 ref={headingRef} tabIndex={-1}>Paiement non finalisé.</h1>
        <p className="cm-confirm__lead">
          Vos articles vous sont encore réservés quelques minutes. Reprenez le paiement de {formatPrice(view.total)}, ou revenez à
          votre panier pour le modifier.
        </p>
      </div>
      <div className="cm-confirm__actions">
        {view.paymentUrl ? (
          <a className="primary-button cm-block-button" href={view.paymentUrl}>Reprendre le paiement</a>
        ) : null}
        <button type="button" className="cm-text-button" onClick={onBackToCart} disabled={busy}>
          {busy ? <LoaderCircle className="spin" aria-hidden="true" size={15} /> : null} Revenir au panier
        </button>
      </div>
    </div>
  );
}
