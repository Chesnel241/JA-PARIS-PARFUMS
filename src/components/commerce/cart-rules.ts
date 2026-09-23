// Règles de quantité du panier, partagées par le contexte et les composants
// (module sans dépendance pour éviter les imports circulaires).

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_CART_LINES = 50;

// Quantité maximale d'une ligne : plafond de 10, et jamais plus que le stock connu.
export function maxQuantityForStock(stock?: number): number {
  return stock === undefined ? MAX_QUANTITY_PER_LINE : Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, Math.trunc(stock)));
}
