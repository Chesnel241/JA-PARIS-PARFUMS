// Formes JSON des réponses de l'API (côté client). Voir docs/API.md.

export type ApiErrorBody = {
  error: string;
  // Présent sur les 422 de validation : sortie de z.flattenError().
  fields?: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
  // Code machine optionnel (OUT_OF_STOCK, UNAVAILABLE, MEDIA_IN_USE…).
  code?: string;
  // 409 commande : article en cause ; `available` si stock insuffisant.
  item?: { slug: string; volume: string; available?: number };
  // 429 : délai avant nouvel essai (secondes, aussi dans l'en-tête Retry-After).
  retryAfter?: number;
  // 409 média : usages empêchant la suppression.
  usages?: MediaUsage[];
};

export type MediaUsage = {
  type: "product" | "article" | "setting" | "ambassador" | "store";
  id: string;
  label: string;
  adminUrl: string;
};

export type OrderItemResponse = {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  volume: string;
  quantity: number;
  price: number; // centimes, prix unitaire relu en base
};

export type OrderResponse = {
  id: string;
  reference: string; // « JAE-7K3P9Q » : à indiquer dans le message Lydia
  email: string;
  subtotal: number; // centimes (= subtotalAmount)
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  deliveryAddress: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    postalCode: string;
    city: string;
    country: string;
    phone?: string;
  };
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderResponse = {
  order: OrderResponse;
  payment: { method: "lydia"; url: string; reference: string; amount: number; message: string };
};

export type MediaAssetResponse = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
};

export type HealthResponse = { status: "ok" | "degraded"; db: "ok" | "down"; time: string };
