import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import { MotionProvider } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollAnimator } from "@/components/experience/scroll-animator";

/**
 * Habillage commun des pages publiques : barre d'annonce, lien d'évitement,
 * en-tête, contenu, pied de page. Seule couche d'animation globale : des
 * apparitions discrètes au défilement (IntersectionObserver + CSS), sans
 * bibliothèque ni défilement détourné, pour une navigation instantanée.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <MotionProvider>
        <div className="site-shell">
          <a className="skip-link" href="#contenu">Aller au contenu</a>
          <p className="promo-bar">Livraison offerte dès 50 €<span className="promo-extra"><span aria-hidden="true"> · </span>Paiement sécurisé via Lydia</span></p>
          <SiteHeader />
          <main id="contenu" tabIndex={-1}>{children}</main>
          <SiteFooter />
        </div>
        <ScrollAnimator />
      </MotionProvider>
    </CartProvider>
  );
}
