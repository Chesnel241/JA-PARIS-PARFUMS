// Constantes partagées entre composants serveur et client du parcours d'achat
// (un module "use client" ne peut pas exporter de simples valeurs vers le serveur).

// Source unique : src/lib/payment.ts.
export { LYDIA_PAYMENT_URL } from "@/lib/payment";
