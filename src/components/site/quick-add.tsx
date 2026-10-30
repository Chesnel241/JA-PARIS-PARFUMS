"use client";

import { useEffect, useRef, useState } from "react";
import { useCart, type CartItemInput } from "@/lib/cart";
import { safeImageSrc } from "@/components/commerce/media";
import { PlusIcon } from "@/components/maison/icons";
import { useMaison } from "@/components/maison/maison-context";

/** Bouton « + » des cartes : ajoute la contenance disponible et ouvre le panier. */
export function QuickAdd({ item, label, className = "plus", children }: {
  item: CartItemInput;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { addItem, openDrawer, hydrated } = useCart();
  const { toast } = useMaison();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`${className}${added ? " is-added" : ""}`}
      aria-label={label ?? `Ajouter ${item.name}, ${item.volume}, au panier`}
      disabled={!hydrated}
      onClick={() => {
        const result = addItem({ ...item, image: safeImageSrc(item.image) }, 1);
        if (result.added > 0) {
          setAdded(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setAdded(false), 1600);
          openDrawer();
        } else {
          toast(`Quantité maximale atteinte pour ${item.name}, ${item.volume}.`);
        }
      }}
    >
      {children ?? <PlusIcon />}
    </button>
  );
}
