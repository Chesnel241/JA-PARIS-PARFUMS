// Paiement par lien Lydia fixe (pas d'API) : le client paie le montant total
// en indiquant la référence de sa commande dans le message ; l'admin confirme
// ensuite le paiement manuellement (/admin/commandes).
export const LYDIA_PAYMENT_URL = "https://pay.lydia.me/l?t=jessicaa9zq1";

export type PaymentInstructions = {
  method: "lydia";
  url: string;
  reference: string;
  amount: number; // centimes
  message: string;
};

export function lydiaPaymentInstructions(reference: string, amount: number): PaymentInstructions {
  return {
    method: "lydia",
    url: LYDIA_PAYMENT_URL,
    reference,
    amount,
    message: `Indiquez la référence ${reference} dans le message de votre paiement Lydia.`,
  };
}
