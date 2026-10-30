import type { ReactNode } from "react";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { getPublicProducts } from "@/lib/catalog";
import { getPublicStores } from "@/lib/community-service";
import { toMaisonItem } from "@/lib/maison";
import { MotionProvider } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollAnimator } from "@/components/experience/scroll-animator";
import { MaisonProvider } from "@/components/maison/maison-context";
import { MaisonSprite } from "@/components/maison/logo";
import { LettreSlot } from "@/components/site/newsletter-form";

// Grotesque serrée pour les titres et le texte, serif italique pour les noms.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], display: "swap" });
const sans = Schibsted_Grotesk({ subsets: ["latin"], display: "swap" });

// Familles exposées sur :root pour que les calques (panier, menu, recherche),
// rendus hors de l'arbre principal, en héritent aussi. Valeurs générées au
// build par next/font (aucune donnée externe).
const fontVariables = `:root{--f-serif:${serif.style.fontFamily};--f-sans:${sans.style.fontFamily}}`;

/**
 * Habillage commun des pages publiques : lien d'évitement, en-tête (annonce,
 * navigation, horloge de Paris), contenu, Lettre JAE, pied de page.
 * Les données de la maison (catalogue allégé) alimentent l'horloge, la
 * recherche instantanée, le panier et le quiz côté client.
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const [products, stores] = await Promise.all([getPublicProducts(), getPublicStores()]);
  const items = products.map(toMaisonItem);

  return (
    <MaisonProvider items={items}>
      <CartProvider>
        <MotionProvider>
          <style dangerouslySetInnerHTML={{ __html: fontVariables }} />
          <MaisonSprite />
          <div className="maison">
            <a className="skip" href="#contenu">Aller au contenu</a>
            <SiteHeader />
            <main id="contenu" tabIndex={-1}>
              {children}
              <LettreSlot />
            </main>
            <SiteFooter hasStores={stores.length > 0} />
          </div>
          <ScrollAnimator />
        </MotionProvider>
      </CartProvider>
    </MaisonProvider>
  );
}
