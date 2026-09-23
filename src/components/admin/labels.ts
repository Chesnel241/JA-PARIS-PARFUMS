// Libellés et tons des statuts, partagés par toutes les vues admin.
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "En attente", tone: "warning" },
  CONFIRMED: { label: "Confirmée", tone: "info" },
  PREPARING: { label: "En préparation", tone: "info" },
  SHIPPED: { label: "Expédiée", tone: "brand" },
  DELIVERED: { label: "Livrée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  UNPAID: { label: "Paiement en attente", tone: "warning" },
  PAID: { label: "Payée", tone: "success" },
  REFUNDED: { label: "Remboursée", tone: "neutral" },
  FAILED: { label: "Paiement échoué", tone: "danger" },
};

export const APPLICATION_STATUS: Record<string, { label: string; tone: Tone; plural: string }> = {
  NEW: { label: "Nouvelle", tone: "brand", plural: "Nouvelles" },
  CONTACTED: { label: "Contactée", tone: "info", plural: "Contactées" },
  ACCEPTED: { label: "Acceptée", tone: "success", plural: "Acceptées" },
  REJECTED: { label: "Refusée", tone: "neutral", plural: "Refusées" },
};

export const APPLICATION_STATUS_ORDER = ["NEW", "CONTACTED", "ACCEPTED", "REJECTED"] as const;

export const LOW_STOCK_THRESHOLD = 5;
