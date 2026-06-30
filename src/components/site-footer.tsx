import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand"><span>JAE</span><small>PARIS</small></div>
      <p>Parfums de caractère, composés à Paris.</p>
      <div className="footer-links">
        <Link href="/boutique">Nos parfums</Link><Link href="/accessoires">Accessoires</Link><Link href="/journal">Journal</Link><Link href="/boutiques">Nous trouver</Link><Link href="/admin">Espace maison</Link>
      </div>
      <div className="footer-bottom"><span>© 2026 JAE Paris</span><span>Livraison offerte dès 50 €</span></div>
    </footer>
  );
}
