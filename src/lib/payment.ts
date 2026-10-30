// Paiement : carte bancaire uniquement, via Stripe Checkout (voir
// src/lib/stripe.ts). Module sans dépendance serveur : utilisable partout.

export type PaymentInstructions = {
  method: "stripe";
  url: string; // page de paiement Stripe vers laquelle rediriger le client
  sessionId: string;
  reference: string;
  amount: number; // centimes
  expiresAt: string;
};

// Textes publics sur le paiement (une seule source).
export const PAYMENT_COPY = {
  short: "Paiement sécurisé par carte bancaire",
  detail: "Carte bancaire, via Stripe",
  drawer: "Paiement sécurisé par carte bancaire, sur la page de paiement Stripe.",
  faq: "Le paiement se fait par carte bancaire sur la page sécurisée de Stripe, juste après la saisie de votre adresse. Vos données bancaires ne transitent jamais par notre site.",
} as const;
