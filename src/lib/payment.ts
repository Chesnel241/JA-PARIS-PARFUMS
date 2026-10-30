// Moyens de paiement (module sans dépendance serveur : utilisable partout).
//
// - « stripe » : carte bancaire via Stripe Checkout, dès que STRIPE_SECRET_KEY
//   est configurée (voir src/lib/stripe.ts) ;
// - « lydia » : repli historique, lien Lydia fixe (pas d'API) : le client paie
//   le montant total en indiquant la référence de sa commande dans le
//   message ; l'admin confirme ensuite le paiement manuellement.
export type PaymentProvider = "stripe" | "lydia";

export const LYDIA_PAYMENT_URL = "https://pay.lydia.me/l?t=jessicaa9zq1";

export type PaymentInstructions =
  | { method: "lydia"; url: string; reference: string; amount: number; message: string }
  | { method: "stripe"; url: string; sessionId: string; reference: string; amount: number; expiresAt: string };

export function lydiaPaymentInstructions(reference: string, amount: number): PaymentInstructions {
  return {
    method: "lydia",
    url: LYDIA_PAYMENT_URL,
    reference,
    amount,
    message: `Indiquez la référence ${reference} dans le message de votre paiement Lydia.`,
  };
}

// Textes publics selon le moyen de paiement actif.
export function paymentCopy(provider: PaymentProvider) {
  return provider === "stripe"
    ? {
        short: "Paiement sécurisé par carte bancaire",
        detail: "Carte bancaire, via Stripe",
        drawer: "Paiement sécurisé par carte bancaire, sur la page de paiement Stripe.",
        faq: "Le paiement se fait par carte bancaire sur la page sécurisée de Stripe, juste après la saisie de votre adresse. Vos données bancaires ne transitent jamais par notre site.",
      }
    : {
        short: "Paiement sécurisé via Lydia",
        detail: "Via Lydia, après validation",
        drawer: "Paiement sécurisé via Lydia, après validation de la commande.",
        faq: "Le paiement est sécurisé et se fait via Lydia, après validation de votre commande.",
      };
}
