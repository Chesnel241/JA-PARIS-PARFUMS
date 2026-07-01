"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";

export function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notes.top.some((n) => n.toLowerCase().includes(q)) ||
        p.notes.heart.some((n) => n.toLowerCase().includes(q)) ||
        p.notes.base.some((n) => n.toLowerCase().includes(q)),
    );
  }, [query, products]);

  return (
    <div className="search-panel">
      <div className="search-field">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, note, famille olfactive…"
          autoFocus
          aria-label="Rechercher un produit"
        />
        {query ? (
          <button onClick={() => setQuery("")} aria-label="Effacer la recherche"><X size={18} /></button>
        ) : (
          <Search size={18} aria-hidden />
        )}
      </div>

      {query.trim() && results.length === 0 ? (
        <p className="search-empty">Aucun résultat pour « {query} ».</p>
      ) : (
        <div className="search-results">
          {results.map((product) => (
            <Link key={product.slug} href={`/produit/${product.slug}`} className="search-result">
              <div className="search-result-thumb" style={{ background: `${product.accent}15` }}>
                <Image src={product.image} alt={product.name} fill style={{ objectFit: "contain", padding: 8 }} />
              </div>
              <div>
                <h3>{product.name}</h3>
                <p>{product.subtitle}</p>
              </div>
              <span className="search-result-price">{formatPrice(product.variants[0]?.price ?? 0)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
