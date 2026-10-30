"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMinutes } from "@/lib/heures";
import { useMaison } from "@/components/maison/maison-context";

/** « Paris, 19:04 » (rendu après montage uniquement). */
export function ParisTime() {
  const { now } = useMaison();
  return <span>{now === null ? "Paris" : `Paris, ${formatMinutes(now)}`}</span>;
}

/** Lien « Panier » du pied de page : ouvre le tiroir (reste un vrai lien sans JS). */
export function CartOpenButton() {
  const { openDrawer } = useCart();
  return (
    <Link
      href="/panier"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openDrawer();
      }}
    >
      Panier
    </Link>
  );
}
