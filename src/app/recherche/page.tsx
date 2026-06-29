"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { getPublicProducts } from "@/lib/catalog";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.notes.top.some((n) => n.toLowerCase().includes(q)) ||
          p.notes.heart.some((n) => n.toLowerCase().includes(q)) ||
          p.notes.base.some((n) => n.toLowerCase().includes(q))
      )
    );
  }, [query, products]);

  return (
    <div className="page-shell">
      <header className="page-intro compact">
        <p className="eyebrow">Recherche</p>
        <h1>Trouver son<br /><em>sillage.</em></h1>
      </header>
      <div style={{ position: "relative", marginBottom: 55 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, note, famille olfactive…"
          autoFocus
          style={{
            width: "100%",
            border: 0,
            borderBottom: "1px solid var(--line)",
            background: "transparent",
            padding: "18px 40px 18px 0",
            fontSize: 18,
            fontFamily: "var(--font-display), serif",
            outline: 0,
          }}
        />
        {query ? (
          <button
            onClick={() => setQuery("")}
            style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        ) : (
          <Search size={18} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
        )}
      </div>

      {loading ? (
        <p style={{ color: "#817971", fontSize: 13 }}>Chargement du catalogue…</p>
      ) : query.trim() && results.length === 0 ? (
        <p style={{ color: "#817971" }}>Aucun résultat pour « {query} ».</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {results.map((product) => (
            <Link
              key={product.slug}
              href={`/produit/${product.slug}`}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                gap: 20,
                alignItems: "center",
                padding: "18px 0",
                borderTop: "1px solid var(--line)",
              }}
            >
              <div style={{ width: 80, height: 100, background: `${product.accent}15`, display: "grid", placeItems: "center", position: "relative" }}>
                <Image src={product.image} alt={product.name} fill style={{ objectFit: "contain", padding: 8 }} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 6px", font: "500 21px var(--font-display), serif" }}>{product.name}</h3>
                <p style={{ margin: 0, color: "#6e665e", fontSize: 12 }}>{product.subtitle}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(product.variants[0]?.price ?? 0)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
