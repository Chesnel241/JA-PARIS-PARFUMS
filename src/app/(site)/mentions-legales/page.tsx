import Link from "next/link";
import { LegalPage, Todo } from "@/components/site/legal-page";
import { pageMetadata } from "@/components/site/seo";

export function generateMetadata() {
  return pageMetadata({ title: "Mentions légales", description: "Mentions légales du site JAE Paris : éditeur, hébergeur, propriété intellectuelle.", path: "/mentions-legales" });
}

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" updated="23 septembre 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>Le site JAE Paris est édité par :</p>
        <ul>
          <li>Raison sociale : <Todo /></li>
          <li>Forme juridique et capital social : <Todo /></li>
          <li>Siège social : <Todo /></li>
          <li>RCS / SIRET : <Todo /></li>
          <li>Numéro de TVA intracommunautaire : <Todo /></li>
          <li>E-mail : <Todo /> · Téléphone : <Todo /></li>
          <li>Directeur ou directrice de la publication : <Todo /></li>
        </ul>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L’ensemble des contenus du site (textes, photographies, visuels, logo, marque JAE Paris) est protégé par le droit
          de la propriété intellectuelle. Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
        </p>
      </section>
      <section>
        <h2>Données personnelles et cookies</h2>
        <p>
          Le traitement de vos données est décrit dans notre <Link href="/confidentialite">politique de confidentialité</Link>.
          Le site n’utilise aucun cookie publicitaire ni de mesure d’audience : seul le contenu du panier est conservé dans
          votre navigateur, et un cookie de session est utilisé pour l’espace d’administration.
        </p>
      </section>
      <section>
        <h2>Conditions de vente</h2>
        <p>Les achats effectués sur le site sont régis par nos <Link href="/cgv">conditions générales de vente</Link>.</p>
      </section>
    </LegalPage>
  );
}
