import Link from "next/link";
import { Logo } from "@/components/maison/logo";
import { CartOpenButton, ParisTime } from "@/components/site/footer-live";

/** Pied de page : signature, trois colonnes, grand logotype et heure de Paris. */
export function SiteFooter({ hasStores }: { hasStores: boolean }) {
  return (
    <footer className="pied">
      <div className="wrap">
        <div className="pied-cols">
          <div className="pied-intro">
            <Link className="logo" href="/" aria-label="JAE Paris, accueil"><Logo title={null} /></Link>
            <p>Maison de parfum parisienne. Des eaux de parfum, une pour chaque heure du jour, et des bijoux dorés.</p>
          </div>
          <nav aria-labelledby="pied-boutique">
            <h2 id="pied-boutique">Boutique</h2>
            <ul>
              <li><Link href="/boutique">Les parfums</Link></li>
              <li><Link href="/accessoires">Les Ors</Link></li>
              <li><Link href="/trouver-mon-heure">Trouver mon heure</Link></li>
              <li><CartOpenButton /></li>
            </ul>
          </nav>
          <nav aria-labelledby="pied-maison">
            <h2 id="pied-maison">La maison</h2>
            <ul>
              <li><Link href="/ambassadrices">Le Cercle JAE</Link></li>
              <li><Link href="/journal">Le Journal</Link></li>
              <li>{hasStores ? <Link href="/boutiques">Points de vente</Link> : <span>Points de vente bientôt annoncés</span>}</li>
            </ul>
          </nav>
          <nav aria-labelledby="pied-infos">
            <h2 id="pied-infos">Informations</h2>
            <ul>
              <li><Link href="/cgv#livraison">Livraison et retours</Link></li>
              <li><Link href="/cgv">CGV</Link></li>
              <li><Link href="/mentions-legales">Mentions légales</Link></li>
              <li><Link href="/confidentialite">Confidentialité</Link></li>
            </ul>
          </nav>
        </div>
        <div className="pied-mark" aria-hidden="true"><Logo title={null} /></div>
        <div className="pied-bas">
          <span>Composé à Paris</span>
          <span>© {new Date().getFullYear()} JAE Paris</span>
          <ParisTime />
          <Link href="/admin" prefetch={false}>Espace maison</Link>
        </div>
      </div>
    </footer>
  );
}
