import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import { MotionProvider } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Sans JavaScript, les éléments « révélés » au scroll restent visibles.
const noScriptStyle = "<style>[data-reveal]{opacity:1!important;transform:none!important}</style>";

/** Habillage commun des pages publiques : lien d'évitement, en-tête, contenu, pied de page. */
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
        <noscript dangerouslySetInnerHTML={{ __html: noScriptStyle }} />
      </MotionProvider>
    </CartProvider>
  );
}
