import Link from "next/link";
import { LegalPage, Todo } from "@/components/site/legal-page";
import { pageMetadata } from "@/components/site/seo";

export function generateMetadata() {
  return pageMetadata({
    title: "Conditions générales de vente",
    description: "Conditions générales de vente JAE Paris : commande, paiement par Lydia, livraison offerte dès 50 €, rétractation sous 14 jours.",
    path: "/cgv",
  });
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      updated="23 septembre 2026"
      intro="Ces conditions s’appliquent à toute commande passée sur le site JAE Paris par un consommateur."
    >
      <section>
        <h2>1. Vendeur</h2>
        <p>
          Les produits sont vendus par <Todo>raison sociale</Todo>, <Todo>siège social</Todo>, <Todo>RCS / SIRET</Todo>,
          ci-après « JAE Paris ». Contact : <Todo>e-mail du service client</Todo>. Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
        </p>
      </section>

      <section>
        <h2>2. Produits</h2>
        <p>
          JAE Paris propose des parfums et des accessoires (bijoux en laiton doré). Les caractéristiques essentielles de
          chaque produit figurent sur sa fiche. Les photographies sont les plus fidèles possible mais n’ont pas de valeur
          contractuelle. Les offres sont valables dans la limite des stocks disponibles.
        </p>
      </section>

      <section>
        <h2>3. Prix</h2>
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises. Les frais de livraison sont précisés avant la validation
          de la commande. JAE Paris peut modifier ses prix à tout moment ; le prix appliqué est celui affiché au moment de la commande.
        </p>
      </section>

      <section>
        <h2>4. Commande</h2>
        <p>
          Vous sélectionnez vos produits, vérifiez votre panier puis renseignez vos coordonnées de livraison. La commande est
          enregistrée à la validation du formulaire, puis vous êtes redirigé vers le lien de paiement. Elle devient ferme à
          réception du paiement. JAE Paris se réserve le droit d’annuler une commande non réglée ou présentant une anomalie.
        </p>
      </section>

      <section>
        <h2>5. Paiement</h2>
        <p>
          Le paiement s’effectue en ligne via un lien de paiement <strong>Lydia</strong>, service sécurisé qui accepte
          notamment la carte bancaire. JAE Paris n’a jamais accès à vos coordonnées bancaires. La commande est préparée
          après confirmation du paiement.
        </p>
      </section>

      <section>
        <h2>6. Livraison</h2>
        <ul>
          <li>Zone de livraison : <Todo>pays desservis</Todo>.</li>
          <li>Frais de livraison : <strong>5,90 € TTC</strong>, <strong>offerts dès 50 € d’achat</strong>.</li>
          <li>Expédition sous 2 à 3 jours ouvrés après réception du paiement ; transporteur : <Todo />.</li>
        </ul>
        <p>
          En cas de retard important, vous pouvez annuler la commande dans les conditions prévues par le Code de la
          consommation. Vérifiez l’état du colis à réception et signalez toute anomalie au transporteur et au service client.
        </p>
      </section>

      <section>
        <h2>7. Droit de rétractation</h2>
        <p>
          Vous disposez d’un délai de <strong>14 jours</strong> à compter de la réception de votre commande pour vous rétracter,
          sans avoir à justifier de motif (article L221-18 du Code de la consommation). Informez-nous de votre décision par
          e-mail à <Todo>adresse e-mail</Todo>, par exemple au moyen du formulaire ci-dessous, puis retournez les produits dans
          les 14 jours suivant cette communication, à <Todo>adresse de retour</Todo>. Les frais de retour sont à votre charge.
        </p>
        <p>
          Nous vous remboursons la totalité des sommes versées, y compris les frais de livraison initiaux (sur la base du
          mode standard), au plus tard 14 jours après avoir été informés de votre décision. Le remboursement peut être
          différé jusqu’à réception des produits, et s’effectue par le même moyen de paiement.
        </p>
        <p>
          Conformément à l’article L221-28 du Code de la consommation, le droit de rétractation ne s’applique pas aux
          biens descellés après la livraison qui ne peuvent être renvoyés pour des raisons d’hygiène ou de protection de la
          santé (parfum dont le blister ou le scellé a été ouvert, boucles d’oreilles portées).
        </p>
        <div className="legal-form">
          <h3>Modèle de formulaire de rétractation</h3>
          <p>
            À l’attention de JAE Paris, <Todo>adresse</Todo>, <Todo>e-mail</Todo> : je vous notifie par la présente ma
            rétractation du contrat portant sur la vente du bien ci-dessous. Commandé le / reçu le : … · Numéro de commande : …
            · Nom : … · Adresse : … · Date et signature (en cas d’envoi papier) : …
          </p>
        </div>
      </section>

      <section>
        <h2>8. Garanties légales</h2>
        <p>
          Les produits bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la
          consommation), pendant deux ans à compter de la délivrance, et de la garantie des vices cachés (articles 1641 et
          suivants du Code civil). Pour toute demande, contactez le service client.
        </p>
      </section>

      <section>
        <h2>9. Réclamations et médiation</h2>
        <p>
          Toute réclamation peut être adressée au service client : <Todo>e-mail</Todo>. À défaut de solution amiable, vous
          pouvez recourir gratuitement au médiateur de la consommation : <Todo>nom et coordonnées du médiateur</Todo>.
        </p>
      </section>

      <section>
        <h2>10. Données personnelles</h2>
        <p>Les données nécessaires à votre commande sont traitées conformément à notre <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </section>

      <section>
        <h2>11. Droit applicable</h2>
        <p>Les présentes conditions sont soumises au droit français. En cas de litige, les tribunaux français sont compétents, sous réserve des règles protectrices du consommateur.</p>
      </section>
    </LegalPage>
  );
}
