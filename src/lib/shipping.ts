// Livraison offerte à partir de 50 € d'achat ; sinon forfait de 5,90 €.
// Montants en centimes. Source unique de vérité (panier + commande serveur).
export const FREE_SHIPPING_THRESHOLD = 5000; // 50,00 €
export const SHIPPING_FEE = 590; // 5,90 €

export function computeShipping(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
