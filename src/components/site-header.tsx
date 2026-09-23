"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { AnimatePresence, EASE_OUT, m, useReducedMotion } from "@/components/motion";

export const NAV_LINKS = [
  { label: "Parfums", href: "/boutique" },
  { label: "Accessoires", href: "/accessoires" },
  { label: "Ambassadrices", href: "/ambassadrices" },
  { label: "Journal", href: "/journal" },
  { label: "Boutiques", href: "/boutiques" },
] as const;

const DESKTOP_QUERY = "(min-width: 1024px)";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="wordmark" href="/" aria-label="JAE Paris — accueil" onClick={onClick}>
      <span>JAE</span>
      <small>Paris</small>
    </Link>
  );
}

/** Pastille du panier : rendue après montage, « pulse » quand la quantité change. */
function CartBadge({ count }: { count: number }) {
  const previous = useRef(count);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (previous.current !== count) {
      previous.current = count;
      setPulse((value) => value + 1);
    }
  }, [count]);
  return (
    <m.span
      key={pulse}
      className="cart-badge"
      aria-hidden
      initial={pulse ? { scale: 1.7 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 16 }}
    >
      {count > 99 ? "99+" : count}
    </m.span>
  );
}

function cartLabel(mounted: boolean, count: number) {
  if (!mounted || count === 0) return "Panier";
  return `Panier, ${count} article${count > 1 ? "s" : ""}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const overHero = pathname === "/";

  useEffect(() => setMounted(true), []);

  // Opaque dès qu'on quitte le haut de page ; masqué en descendant, réaffiché en remontant.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = Math.max(0, window.scrollY);
      setScrolled(y > 8);
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > 180);
        lastY = y;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermeture à la navigation (y compris précédent / suivant) et au passage en desktop.
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => { if (query.matches) setOpen(false); };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    burgerRef.current?.focus();
  }, []);

  const state = open ? "menu" : overHero && !scrolled ? "overlay" : "solid";

  return (
    <>
      <header className="site-header" data-state={state} data-hidden={hidden && !open ? "" : undefined}>
        <div className="site-header-inner">
          <button
            ref={burgerRef}
            type="button"
            className="header-icon menu-toggle"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden size={22} strokeWidth={1.5} />
          </button>

          <nav className="main-nav" aria-label="Navigation principale">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <Wordmark />

          <div className="header-actions">
            <Link className="header-icon" href="/recherche" aria-label="Rechercher" aria-current={pathname === "/recherche" ? "page" : undefined}>
              <Search aria-hidden size={20} strokeWidth={1.5} />
            </Link>
            {/* Lien panier conservé (le tiroir panier sera branché à l'intégration). */}
            <Link className="header-icon bag-link" href="/panier" aria-label={cartLabel(mounted, count)}>
              <ShoppingBag aria-hidden size={20} strokeWidth={1.5} />
              {mounted && count > 0 ? <CartBadge count={count} /> : null}
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? <MobileMenu pathname={pathname} onClose={closeMenu} cartText={cartLabel(mounted, count)} /> : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Menu mobile plein écran. Rendu hors du <header> : l'en-tête utilise
 * transform / backdrop-filter, qui confineraient un enfant position:fixed.
 */
function MobileMenu({ pathname, onClose, cartText }: { pathname: string; onClose: () => void; cartText: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const item = (index: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.55, delay: 0.08 + index * 0.05, ease: EASE_OUT },
  });

  return (
    <m.div
      ref={panelRef}
      id="menu-mobile"
      className="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
    >
      <div className="mobile-menu-bar">
        <button type="button" className="header-icon" aria-label="Fermer le menu" onClick={onClose}>
          <X aria-hidden size={22} strokeWidth={1.5} />
        </button>
        <Wordmark onClick={onClose} />
        <Link className="header-icon" href="/panier" aria-label={cartText} onClick={onClose}>
          <ShoppingBag aria-hidden size={20} strokeWidth={1.5} />
        </Link>
      </div>

      <nav className="mobile-menu-nav" aria-label="Menu principal">
        <ul>
          {NAV_LINKS.map((link, index) => (
            <m.li key={link.href} {...item(index)}>
              <Link href={link.href} onClick={onClose} aria-current={isActive(pathname, link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            </m.li>
          ))}
        </ul>
      </nav>

      <m.div className="mobile-menu-foot" {...item(NAV_LINKS.length)}>
        <Link className="primary-button block" href="/ambassadrices#candidature" onClick={onClose}>
          Devenir ambassadrice <ArrowRight aria-hidden />
        </Link>
        <Link className="text-link" href="/recherche" onClick={onClose}>
          <Search aria-hidden /> Rechercher
        </Link>
        <p>Livraison offerte dès 50 €</p>
      </m.div>
    </m.div>
  );
}
