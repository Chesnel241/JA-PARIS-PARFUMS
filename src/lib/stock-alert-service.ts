import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// Enregistre une demande « M'avertir du retour » pour une contenance épuisée
// d'un produit publié. Idempotent : redemander réarme simplement l'alerte.
export async function createStockAlert(input: { email: string; slug: string; volume: string }) {
  const product = await prisma.product.findFirst({
    where: { slug: input.slug, isActive: true },
    select: { id: true, variants: { where: { isActive: true, volume: input.volume }, select: { stock: true } } },
  });
  const variant = product?.variants[0];
  if (!product || !variant) throw new ApiError(404, "Cette création est introuvable.");
  if (variant.stock > 0) throw new ApiError(409, "Bonne nouvelle : cette contenance est de nouveau disponible.");

  return prisma.stockAlert.upsert({
    where: { email_productId_volume: { email: input.email, productId: product.id, volume: input.volume } },
    update: { notifiedAt: null },
    create: { email: input.email, productId: product.id, volume: input.volume },
    select: { id: true },
  });
}

// Liste admin : chaque alerte avec le stock actuel de la contenance demandée
// (pour repérer d'un coup d'œil les clientes à prévenir).
export async function listStockAlerts() {
  const alerts = await prisma.stockAlert.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, name: true, slug: true, variants: { select: { volume: true, stock: true, isActive: true } } } } },
  });
  return alerts.map((alert) => {
    const variant = alert.product.variants.find((entry) => entry.volume === alert.volume);
    return {
      id: alert.id,
      email: alert.email,
      volume: alert.volume,
      createdAt: alert.createdAt,
      notifiedAt: alert.notifiedAt,
      product: { id: alert.product.id, name: alert.product.name, slug: alert.product.slug },
      stock: variant?.isActive ? variant.stock : 0,
    };
  });
}

export function countPendingStockAlerts() {
  return prisma.stockAlert.count({ where: { notifiedAt: null } });
}

export function setStockAlertNotified(id: string, notified: boolean) {
  return prisma.stockAlert.update({ where: { id }, data: { notifiedAt: notified ? new Date() : null }, select: { id: true, notifiedAt: true } });
}

export function deleteStockAlert(id: string) {
  return prisma.stockAlert.delete({ where: { id } });
}

// Alertes à traiter : pas encore prévenues alors que la contenance est revenue.
export async function countStockAlertsToNotify() {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS "count"
    FROM "StockAlert" a
    JOIN "ProductVariant" v ON v."productId" = a."productId" AND v."volume" = a."volume"
    WHERE a."notifiedAt" IS NULL AND v."isActive" = true AND v."stock" > 0
  `;
  return Number(rows[0]?.count ?? 0);
}
