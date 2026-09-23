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

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="section-shell footer-cta">
        <div>
          <p className="eyebrow">Programme ambassadrices</p>
          <p className="footer-cta-title">Devenir ambassadrice</p>
        </div>
        <Link className="primary-button light" href="/ambassadrices#candidature">
          Proposer ma candidature <ArrowRight aria-hidden />
        </Link>
      </div>

      <div className="section-shell footer-main">
        <Link className="wordmark footer-wordmark" href="/" aria-label="JAE Paris — accueil">
          <span>JAE</span>
          <small>Paris</small>
        </Link>
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
      </div>

      <div className="section-shell footer-bottom">
        <p>© {new Date().getFullYear()} JAE Paris</p>
        <p>Livraison offerte dès 50 € · Paiement sécurisé via Lydia</p>
        <Link href="/admin" prefetch={false} className="footer-staff">Espace maison</Link>
      </div>
    </footer>
  );
}
