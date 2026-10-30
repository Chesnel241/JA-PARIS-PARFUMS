"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { buildSearchIndex, noteSuggestions, searchIndex } from "@/lib/search";
import { toMaisonItem } from "@/lib/maison";
import { CloseIcon, SearchIcon } from "@/components/maison/icons";
import { ProductCard } from "@/components/product-card";

const DEBOUNCE_MS = 160;

/** Recherche plein écran : produits en cartes, pages de la maison en liste. */
export function ProductSearch({ products, initialQuery = "" }: { products: Product[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => products.map(toMaisonItem), [products]);
  const index = useMemo(() => buildSearchIndex(items), [items]);
  const bySlug = useMemo(() => new Map(products.map((product) => [product.slug, product])), [products]);
  const suggestions = useMemo(() => noteSuggestions(items, 8), [items]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // ?q= synchronisé dans l'URL (partageable), sans rechargement ni historique parasite.
  useEffect(() => {
    const trimmed = debounced.trim();
    const url = trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche";
    try {
      if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(window.history.state, "", url);
    } catch {
      // ignore
    }
  }, [debounced]);

  const trimmed = debounced.trim();
  const results = useMemo(() => searchIndex(index, trimmed), [index, trimmed]);
  const productResults = results.flatMap((entry) => (entry.slug && bySlug.get(entry.slug) ? [bySlug.get(entry.slug) as Product] : []));
  const pageResults = results.filter((entry) => !entry.slug);

  const apply = (value: string) => {
    setQuery(value);
    setDebounced(value);
    inputRef.current?.focus();
  };

  const status = trimmed
    ? results.length === 0
      ? `Aucun résultat pour « ${trimmed} »`
      : `${results.length} résultat${results.length > 1 ? "s" : ""} pour « ${trimmed} »`
    : "";

  return (
    <div className="wrap rech-page">
      <form className="rech-bar" role="search" onSubmit={(event) => { event.preventDefault(); setDebounced(query); }}>
        <SearchIcon />
        <label htmlFor="search-page-input" className="sr-only">Rechercher un parfum, une note ou un bijou</label>
        <input
          ref={inputRef}
          id="search-page-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 80))}
          onKeyDown={(event) => { if (event.key === "Escape" && query) { event.preventDefault(); apply(""); } }}
          placeholder="Un parfum, une note, un bijou…"
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby="search-page-status"
        />
        {query ? <button type="button" className="icon-btn" onClick={() => apply("")} aria-label="Effacer la recherche"><CloseIcon /></button> : null}
      </form>
      {suggestions.length > 0 ? (
        <ul className="rech-sugg" aria-label="Suggestions">
          <li aria-hidden="true">{trimmed && results.length === 0 ? "Essayez plutôt :" : "Notes à explorer :"}</li>
          {suggestions.map((note) => <li key={note}><button type="button" onClick={() => apply(note)}>{note}</button></li>)}
        </ul>
      ) : null}
      <p id="search-page-status" className="rech-status" role="status" aria-live="polite">{status}</p>

      {productResults.length > 0 ? (
        <ul className="cards c4" aria-label="Créations trouvées">
          {productResults.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} sizes="(min-width: 1100px) 25vw, (min-width: 760px) 50vw, 100vw" />
            </li>
          ))}
        </ul>
      ) : null}
      {pageResults.length > 0 ? (
        <ul className="rech-res" aria-label="Dans la maison">
          {pageResults.map((entry) => (
            <li key={entry.href}><Link href={entry.href}><strong>{entry.title}</strong><span>{entry.sub}</span></Link></li>
          ))}
        </ul>
      ) : null}
      {trimmed && results.length === 0 ? (
        <p className="rech-empty">Aucun résultat pour « {trimmed} ». Essayez une note comme {suggestions.slice(0, 3).join(", ") || "rose ou vanille"}.</p>
      ) : null}
    </div>
  );
}
