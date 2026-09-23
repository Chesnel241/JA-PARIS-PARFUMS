"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search, X } from "lucide-react";
import type { Product } from "@/lib/data";
import { CommerceProductCard } from "@/components/commerce/related-products";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";

const DEBOUNCE_MS = 160;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase()
    .trim();

type Indexed = { product: Product; name: string; haystack: string };

function buildIndex(products: Product[]): Indexed[] {
  return products.map((product) => {
    const notes = [...product.notes.top, ...product.notes.heart, ...product.notes.base];
    const category = product.category === "ACCESSOIRE" ? "accessoire accessoires bijou bijoux" : "parfum parfums fragrance eau de parfum";
    return {
      product,
      name: normalize(product.name),
      haystack: normalize([product.name, product.subtitle, product.description, product.story, notes.join(" "), category, product.variants.map((v) => v.volume).join(" ")].join(" ")),
    };
  });
}

function searchProducts(index: Indexed[], query: string) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return index
    .filter((entry) => tokens.every((token) => entry.haystack.includes(token)))
    .map((entry) => ({
      entry,
      score: tokens.reduce((sum, token) => sum + (entry.name.startsWith(token) ? 3 : entry.name.includes(token) ? 2 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry.product);
}

export function ProductSearch({ products, initialQuery = "" }: { products: Product[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();
  const index = useMemo(() => buildIndex(products), [products]);

  // Suggestions : notes les plus présentes dans la collection.
  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const note of [...product.notes.top, ...product.notes.heart, ...product.notes.base]) {
        counts.set(note, (counts.get(note) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([note]) => note);
  }, [products]);

  const categoryImages = useMemo(() => ({
    PARFUM: products.find((product) => product.category === "PARFUM")?.image,
    ACCESSOIRE: products.find((product) => product.category === "ACCESSOIRE")?.image,
  }), [products]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  // ?q= synchronisé dans l'URL (partageable), sans rechargement ni historique parasite.
  useEffect(() => {
    const trimmed = debounced.trim();
    const url = trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche";
    try {
      if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
    } catch {
      // ignore
    }
  }, [debounced]);

  const trimmed = debounced.trim();
  const results = useMemo(() => searchProducts(index, trimmed), [index, trimmed]);

  const focusResult = (position: number) => {
    const links = resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    if (!links || links.length === 0) return;
    links[Math.max(0, Math.min(links.length - 1, position))].focus();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setDebounced(query);
      focusResult(0);
    } else if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
      setDebounced("");
    } else if (event.key === "Enter") {
      event.preventDefault();
      setDebounced(query);
    }
  };

  const onResultsKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const links = [...(resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current === -1) return;
    const columns = Math.max(1, Math.round((resultsRef.current?.clientWidth ?? 1) / ((links[0]?.parentElement?.clientWidth ?? 1) || 1)));
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    if (event.key in moves) {
      event.preventDefault();
      const next = current + moves[event.key];
      if (next < 0) inputRef.current?.focus();
      else focusResult(next);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusResult(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusResult(links.length - 1);
    } else if (event.key === "Escape") {
      inputRef.current?.focus();
    }
  };

  const applySuggestion = (value: string) => {
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
    <div className="cm-search">
      <form className="cm-search__field" role="search" onSubmit={(event) => event.preventDefault()}>
        <Search aria-hidden="true" className="cm-search__icon" />
        <label htmlFor="cm-search-input" className="sr-only">Rechercher un parfum ou un accessoire</label>
        <input
          ref={inputRef}
          id="cm-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 80))}
          onKeyDown={onInputKeyDown}
          placeholder="Rose, vanille, Or Solaire…"
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby="cm-search-status"
          aria-controls="cm-search-results"
        />
        {query ? (
          <button type="button" className="cm-icon-button" onClick={() => applySuggestion("")} aria-label="Effacer la recherche">
            <X aria-hidden="true" />
          </button>
        ) : null}
      </form>

      <p id="cm-search-status" className="cm-search__status" role="status" aria-live="polite">{status}</p>

      {trimmed && results.length > 0 ? (
        <ul id="cm-search-results" ref={resultsRef} className="cm-search__results" onKeyDown={onResultsKeyDown} aria-label="Résultats de recherche">
          <AnimatePresence initial={false} mode="popLayout">
            {results.map((product, position) => (
              <motion.li
                key={product.slug}
                layout={reduceMotion ? false : "position"}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : Math.min(position, 6) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <CommerceProductCard product={product} priority={position < 2} sizes="(max-width: 760px) 50vw, 25vw" />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="cm-search__suggest">
          {suggestions.length > 0 ? (
            <div className="cm-search__chips">
              <p className="cm-search__label">{trimmed ? "Essayez plutôt" : "Notes à explorer"}</p>
              <ul>
                {suggestions.map((note) => (
                  <li key={note}>
                    <button type="button" className="cm-chip" onClick={() => applySuggestion(note)}>{note}</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="cm-search__categories">
            <p className="cm-search__label">Parcourir</p>
            <div className="cm-search__tiles">
              <CategoryTile href="/boutique" label="Les parfums" image={categoryImages.PARFUM} />
              <CategoryTile href="/accessoires" label="Les accessoires" image={categoryImages.ACCESSOIRE} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTile({ href, label, image: rawImage }: { href: string; label: string; image?: string }) {
  const image = rawImage ? safeImageSrc(rawImage) : undefined;
  return (
    <Link href={href} className="cm-tile">
      {image ? (
        <span className="cm-tile__media">
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 50vw, 360px"
            unoptimized={isUnoptimizedImage(image)}
            className={isVectorImage(image) ? "is-contained" : "is-cover"}
          />
        </span>
      ) : null}
      <span className="cm-tile__label">{label} <ArrowRight aria-hidden="true" size={15} /></span>
    </Link>
  );
}
