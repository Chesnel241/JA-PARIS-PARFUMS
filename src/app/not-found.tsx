import { SiteChrome } from "@/components/site/site-chrome";
import { NotFoundView } from "@/components/site/status-views";
import "@/styles/site.css";
import "@/styles/commerce.css";

export const metadata = { title: "Page introuvable", robots: { index: false } };

// URL inconnue : page 404 avec l'habillage complet du site (en-tête, pied de page).
export default function NotFound() {
  return <SiteChrome><NotFoundView /></SiteChrome>;
}
