// Constantes partagées entre composants serveur et client du parcours d'achat
// (un module "use client" ne peut pas exporter de simples valeurs vers le serveur).

// Repère placé en fin de fiche produit : la barre d'achat collante (mobile) se
// masque lorsqu'on l'atteint pour ne pas couvrir le pied de page.
export const PURCHASE_END_ID = "cm-purchase-end";

export const LYDIA_PAYMENT_URL = "https://pay.lydia.me/l?t=jessicaa9zq1";
