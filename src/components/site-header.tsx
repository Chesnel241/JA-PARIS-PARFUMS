"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart";
import { deName, formatMinutes } from "@/lib/heures";
import { buildSearchIndex, matchedNote, noteSuggestions, searchIndex } from "@/lib/search";
import { AnimatePresence, m, useReducedMotion } from "@/components/motion";
import { useModal } from "@/components/commerce/use-modal";
import { Logo } from "@/components/maison/logo";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/maison/icons";
import { useMaison, useSlot } from "@/components/maison/maison-context";

export const NAV_LINKS = [
  { label: "Parfums", href: "/boutique" },
  { label: "Les Ors", href: "/accessoires" },
  { label: "Le Cercle", href: "/ambassadrices" },
  { label: "Journal", href: "/journal" },
] as const;

const EASE = [0.2, 0.8, 0.2, 1] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function cartLabel(mounted: boolean, count: number) {
  if (!mounted || count === 0) return "Panier";
  return `Panier, ${count} article${count > 1 ? "s" : ""}`;
}

/** Phrase « Il est 19:04 à Paris, c'est l'heure d'Illusion. » (vide avant montage). */
function useNowSentence() {
  const { now } = useMaison();
  const slot = useSlot();
  if (now === null) return "";
  const time = formatMinutes(now);
  return slot ? `Il est ${time} à Paris, c’est l’heure ${deName(slot.item.name)}.` : `Il est ${time} à Paris.`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count, openDrawer } = useCart();
  const { now } = useMaison();
  const [layer, setLayer] = useState<"menu" | "search" | null>(null);
  const [solid, setSolid] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermeture à la navigation (y compris précédent / suivant) et au passage en grand écran.
  useEffect(() => setLayer(null), [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 981px)");
    const onChange = () => { if (query.matches) setLayer((current) => (current === "menu" ? null : current)); };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const close = useCallback(() => setLayer(null), []);
  const time = now === null ? "" : formatMinutes(now);

  return (
    <>
      <header className="site-head" data-solid={solid ? "" : undefined}>
        <div className="annonce">
          <p className="wrap"><span>Livraison offerte dès 50&nbsp;€</span><span>Expédition sous 2 à 3 jours</span><span>Retours sous 14 jours</span></p>
        </div>
        <div className="wrap nav">
          <div className="nav-left">
            <button type="button" className="icon-btn burger" aria-label="Ouvrir le menu" aria-expanded={layer === "menu"} aria-controls="menu-mobile" onClick={() => setLayer("menu")}>
              <MenuIcon />
            </button>
            <Link className="logo" href="/" aria-label="JAE Paris, accueil"><Logo title={null} /></Link>
          </div>
          <nav className="nav-mid" aria-label="Navigation principale">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} className="nav-link" href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined}>{link.label}</Link>
            ))}
          </nav>
          <div className="nav-right">
            <Link className="pill-heure" href="/trouver-mon-heure" aria-label="Trouver mon heure" aria-current={pathname === "/trouver-mon-heure" ? "page" : undefined}>
              <span className="dot" aria-hidden="true" />Trouver mon heure<span className="tab" aria-hidden="true">{time}</span>
            </Link>
            <button type="button" className="icon-btn" aria-label="Rechercher" aria-haspopup="dialog" onClick={() => setLayer("search")}>
              <SearchIcon />
            </button>
            {/* Ouvre le tiroir panier ; reste un vrai lien vers /panier (nouvel onglet, sans JS, déjà sur /panier). */}
            <Link
              className="icon-btn"
              href="/panier"
              aria-haspopup="dialog"
              aria-label={cartLabel(mounted, count)}
              onClick={(event) => {
                if (pathname === "/panier" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                openDrawer();
              }}
            >
              <BagIcon />
              {mounted && count > 0 ? <span key={count} className="cart-count" aria-hidden="true">{count > 99 ? "99+" : count}</span> : null}
            </Link>
          </div>
        </div>
      </header>

      {mounted
        ? createPortal(
            <div className="layer" data-modal-layer="">
              <AnimatePresence>
                {layer === "menu" ? <MobileMenu key="menu" pathname={pathname} onClose={close} /> : null}
                {layer === "search" ? <SearchOverlay key="search" onClose={close} /> : null}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const ref = useModal<HTMLDivElement>(true, onClose);
  const reduce = useReducedMotion();
  const { schedule } = useMaison();
  const sentence = useNowSentence();
  const current = (href: string) => (isActive(pathname, href) ? "page" : undefined);

  return (
    <m.div
      ref={ref}
      id="menu-mobile"
      className="menu-m"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
    >
      <div className="wrap menu-m-head">
        <Link className="logo" href="/" aria-label="JAE Paris, accueil" onClick={onClose}><Logo title={null} /></Link>
        <button type="button" className="icon-btn" aria-label="Fermer le menu" onClick={onClose} data-autofocus=""><CloseIcon /></button>
      </div>
      <nav className="wrap" aria-label="Menu principal">
        <ul>
          <li><Link href="/boutique" onClick={onClose} aria-current={current("/boutique")}>Parfums <small aria-hidden="true">Collection</small></Link></li>
          {schedule.map(({ item }) => (
            <li key={item.slug}>
              <Link className="sub" href={`/produit/${item.slug}`} onClick={onClose} aria-current={current(`/produit/${item.slug}`)}>
                {item.name} <small className="tab">{item.hour}</small>
              </Link>
            </li>
          ))}
          <li><Link href="/accessoires" onClick={onClose} aria-current={current("/accessoires")}>Les Ors <small aria-hidden="true">Accessoires</small></Link></li>
          <li><Link href="/trouver-mon-heure" onClick={onClose} aria-current={current("/trouver-mon-heure")}>Trouver mon heure <small aria-hidden="true">Quiz</small></Link></li>
          <li><Link href="/ambassadrices" onClick={onClose} aria-current={current("/ambassadrices")}>Le Cercle <small aria-hidden="true">Ambassadeurs</small></Link></li>
          <li><Link href="/journal" onClick={onClose} aria-current={current("/journal")}>Le Journal</Link></li>
        </ul>
      </nav>
      <p className="wrap menu-m-now">{sentence}</p>
    </m.div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const ref = useModal<HTMLDivElement>(true, onClose);
  const reduce = useReducedMotion();
  const router = useRouter();
  const { items } = useMaison();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildSearchIndex(items), [items]);
  const suggestions = useMemo(() => {
    const notes = noteSuggestions(items, 5);
    return items.some((item) => item.category === "ACCESSOIRE") ? [...notes, "bijou"] : notes;
  }, [items]);
  const trimmed = query.trim();
  const results = useMemo(() => (trimmed ? searchIndex(index, trimmed) : index.filter((entry) => entry.slug).slice(0, 3)), [index, trimmed]);

  return (
    <>
      <m.div className="voile" aria-hidden="true" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3 }} />
      <m.div
        ref={ref}
        className="recherche"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { y: "-102%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "-102%" }}
        transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
      >
        <div className="wrap rech-inner">
          <form className="rech-bar" role="search" action="/recherche" onSubmit={(event) => {
            event.preventDefault();
            if (!trimmed) return;
            router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
            onClose();
          }}>
            <SearchIcon />
            <label className="sr-only" htmlFor="search-overlay-input">Rechercher</label>
            <input
              ref={inputRef}
              id="search-overlay-input"
              name="q"
              type="search"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Un parfum, une note, un bijou…"
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby="search-overlay-status"
              data-autofocus=""
            />
            <button type="button" className="icon-btn" aria-label="Fermer la recherche" onClick={onClose}><CloseIcon /></button>
          </form>
          {suggestions.length > 0 ? (
            <ul className="rech-sugg" aria-label="Suggestions">
              <li aria-hidden="true">Essayez&nbsp;:</li>
              {suggestions.map((value) => (
                <li key={value}><button type="button" onClick={() => { setQuery(value); inputRef.current?.focus(); }}>{value}</button></li>
              ))}
            </ul>
          ) : null}
          <p id="search-overlay-status" className="sr-only" role="status" aria-live="polite">
            {trimmed ? (results.length ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : `Aucun résultat pour « ${trimmed} »`) : ""}
          </p>
          {results.length > 0 ? (
            <ul className="rech-res">
              {results.map((entry) => {
                const note = trimmed ? matchedNote(entry, trimmed) : null;
                return (
                  <li key={entry.href}>
                    <Link href={entry.href} onClick={onClose}>
                      <strong>{entry.title}</strong>
                      <span>{note ? `Contient ${note.toLocaleLowerCase("fr-FR")} · ` : ""}{entry.sub}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rech-empty">Aucun résultat pour « {trimmed} ». Essayez une note comme {suggestions.slice(0, 3).join(", ") || "rose ou vanille"}.</p>
          )}
          {trimmed ? <Link className="lien rech-all" href={`/recherche?q=${encodeURIComponent(trimmed)}`} onClick={onClose}>Voir la page de résultats</Link> : null}
        </div>
      </m.div>
    </>
  );
}
