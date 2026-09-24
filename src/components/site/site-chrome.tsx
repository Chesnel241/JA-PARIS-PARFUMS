import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import { MotionProvider } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/experience/smooth-scroll";
import { Cursor } from "@/components/experience/cursor";
import { PageTransition } from "@/components/experience/page-transition";
import { ScrollAnimator } from "@/components/experience/scroll-animator";
import { Parallax } from "@/components/experience/parallax";

/**
 * Habillage commun des pages publiques : lien d'évitement, en-tête, contenu,
 * pied de page, et les couches d'expérience (défilement lissé, curseur,
 * transitions de page, révélations au défilement, parallaxe, grain).
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <MotionProvider>
        <div className="site-shell">
          <a className="skip-link" href="#contenu">Aller au contenu</a>
          <SiteHeader />
          <main id="contenu" tabIndex={-1}>{children}</main>
          <SiteFooter />
        </div>
        <div className="film-grain" aria-hidden="true" />
        <PageTransition />
        <Cursor />
        <SmoothScroll />
        <ScrollAnimator />
        <Parallax />
      </MotionProvider>
    </CartProvider>
  );
}
