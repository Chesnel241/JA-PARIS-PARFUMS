"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { useCart } from "@/lib/cart";

export function AddToCart({ product }: { product: Product }) {
  const available = product.variants.filter((variant) => variant.stock > 0);
  const [selected, setSelected] = useState(available[0]);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  return (
    <div className="purchase-box">
      <div className="variant-label"><span>Contenance</span><span>{selected ? formatPrice(selected.price) : "Indisponible"}</span></div>
      <div className="variant-list">
        {product.variants.map((variant) => (
          <button key={variant.volume} disabled={!variant.stock} className={selected?.volume === variant.volume ? "selected" : ""} onClick={() => setSelected(variant)}>
            {variant.volume}<small>{variant.stock ? formatPrice(variant.price) : "Épuisé"}</small>
          </button>
        ))}
      </div>
      <button className="primary-button add-button" disabled={!selected} onClick={() => {
        if (!selected) return;
        addItem({ slug: product.slug, name: product.name, image: product.image, volume: selected.volume, price: selected.price });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}>
        {added ? <><Check size={17} /> Ajouté au panier</> : "Ajouter au panier"}
      </button>
      <p className="stock-note">{selected && selected.stock <= 5 ? `Plus que ${selected.stock} flacons disponibles` : "En stock · Expédition sous 2 à 3 jours"}</p>
    </div>
  );
}
