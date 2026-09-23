import { LegalPage, Todo } from "@/components/site/legal-page";
import { pageMetadata } from "@/components/site/seo";

export function generateMetadata() {
  return pageMetadata({
    title: "Confidentialité",
    description: "Politique de confidentialité JAE Paris : données collectées, finalités, durées de conservation et droits RGPD.",
    path: "/confidentialite",
  });
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="23 septembre 2026" intro="Nous collectons uniquement les données nécessaires, et ne les vendons jamais.">
      <section>
        <h2>Responsable du traitement</h2>
        <p><Todo>raison sociale</Todo>, <Todo>siège social</Todo>. Contact pour toute question relative à vos données : <Todo>e-mail</Todo>.</p>
      </section>

      <section>
        <h2>Données collectées et finalités</h2>
        <h3>Commandes</h3>
        <p>
          Nom, prénom, e-mail, adresse de livraison, téléphone (facultatif) et contenu de la commande, pour préparer, livrer
          et suivre votre commande (exécution du contrat) et respecter nos obligations comptables (obligation légale).
          Conservation : durée de la relation commerciale, puis archivage des pièces comptables pendant 10 ans.
        </p>
        <h3>Candidatures ambassadrices</h3>
        <p>
          Prénom, nom, e-mail, téléphone, compte Instagram, ville et message, pour étudier votre candidature et vous
          recontacter (mesures précontractuelles prises à votre demande). Conservation : 2 ans après le dernier contact.
        </p>
        <h3>Newsletter</h3>
        <p>
          Adresse e-mail, pour vous envoyer nos nouveautés (consentement). Vous pouvez vous désinscrire à tout moment ;
          l’adresse est alors supprimée. À défaut, elle est conservée 3 ans après votre dernière interaction.
        </p>
        <h3>Paiement</h3>
        <p>Le paiement est traité par Lydia. JAE Paris ne reçoit ni ne conserve vos données bancaires.</p>
      </section>

      <section>
        <h2>Destinataires</h2>
        <p>
          Vos données sont accessibles au seul personnel habilité de JAE Paris et à ses prestataires techniques, dans la
          limite de leurs missions : hébergement (Vercel Inc.), base de données (<Todo>prestataire</Todo>), paiement
          (Lydia), livraison (<Todo>transporteur</Todo>).
        </p>
      </section>

      <section>
        <h2>Transferts hors de l’Union européenne</h2>
        <p>
          L’hébergeur Vercel Inc. est situé aux États-Unis. Les transferts éventuels sont encadrés par des garanties
          appropriées (clauses contractuelles types de la Commission européenne ou Data Privacy Framework) <Todo>à vérifier</Todo>.
        </p>
      </section>

      <section>
        <h2>Cookies et stockage local</h2>
        <p>
          Le site n’utilise aucun cookie publicitaire ni outil de mesure d’audience. Le contenu de votre panier est enregistré
          dans votre navigateur (stockage local) pour que vous le retrouviez ; ce stockage est strictement nécessaire au
          service et ne requiert pas de consentement. Un cookie de session est utilisé uniquement pour l’espace d’administration.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d’un droit d’accès, de rectification,
          d’effacement, de limitation, d’opposition et de portabilité de vos données, du droit de retirer votre consentement
          à tout moment, et de définir des directives relatives à leur sort après votre décès. Pour les exercer, écrivez à
          {" "}<Todo>e-mail</Todo>. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>Les données sont transmises de manière chiffrée (HTTPS) et l’accès à l’administration est protégé par authentification.</p>
      </section>
    </LegalPage>
  );
}
