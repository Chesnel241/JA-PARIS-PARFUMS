import Link from "next/link";
import { ArrowRight } from "lucide-react";

const columns = [
  {
    title: "Boutique",
    links: [
      { label: "Parfums", href: "/boutique" },
      { label: "Accessoires", href: "/accessoires" },
      { label: "Recherche", href: "/recherche" },
      { label: "Panier", href: "/panier" },
    ],
  },
  {
    title: "La maison",
    links: [
      { label: "Ambassadrices", href: "/ambassadrices" },
      { label: "Journal", href: "/journal" },
      { label: "Boutiques", href: "/boutiques" },
    ],
  },
  {
    title: "Informations",
    links: [
      { label: "Conditions générales de vente", href: "/cgv" },
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
    ],
  },
];

/**
 * Pied de page « rideau » : sur grand écran, il est révélé par-dessous quand le
 * contenu remonte (position sticky), et se clôt sur la signature JAE en très
 * grand, dans une matière dorée.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="section-shell footer-cta">
          <div>
            <p className="eyebrow">Programme ambassadrices</p>
            <p className="footer-cta-title">Portez le sillage avec nous</p>
          </div>
          <Link className="primary-button light" href="/ambassadrices#candidature">
            Proposer ma candidature <ArrowRight aria-hidden />
          </Link>
        </div>

        <div className="section-shell footer-main">
          <nav className="footer-nav" aria-label="Pied de page">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="footer-heading">{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="footer-promise">
            <p>Livraison offerte dès 50 €</p>
            <p>Paiement sécurisé via Lydia</p>
            <p>Composé à Paris</p>
          </div>
        </div>

        <div className="section-shell footer-bottom">
          <Link className="wordmark footer-wordmark" href="/" aria-label="JAE Paris — accueil"><span>JAE</span><small>Paris</small></Link>
          <p>© {new Date().getFullYear()} JAE Paris</p>
          <Link href="/admin" prefetch={false} className="footer-staff">Espace maison</Link>
        </div>
      </div>
    </footer>
  );
}
