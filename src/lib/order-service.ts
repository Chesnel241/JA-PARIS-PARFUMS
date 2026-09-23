import { randomInt } from "crypto";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { MAX_QUANTITY_PER_LINE, isFrance, mergeOrderLines, type OrderInput } from "@/lib/order-validation";
import { computeShipping } from "@/lib/shipping";

const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
  user: { select: { name: true } },
};

type TransactionClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Référence de commande
// ---------------------------------------------------------------------------

// Référence lisible que le client recopie dans son message Lydia :
// « JAE-7K3P9Q ». Alphabet sans caractères ambigus (0/O, 1/I/L).
export const ORDER_REFERENCE_PREFIX = "JAE-";
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REFERENCE_LENGTH = 6;

export function generateOrderReference() {
  let code = "";
  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${ORDER_REFERENCE_PREFIX}${code}`;
}

// Référence affichable pour toute commande (y compris les plus anciennes).
export function orderReference(order: { id: string; reference?: string | null }) {
  return order.reference ?? `${ORDER_REFERENCE_PREFIX}${order.id.slice(-8).toUpperCase()}`;
}

// Montants détaillés d'une commande (centimes).
export function orderAmounts(order: { subtotalAmount?: number; shippingAmount?: number; totalAmount: number; items?: { price: number; quantity: number }[] }) {
  const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = order.subtotalAmount || itemsTotal || 0;
  const shippingAmount = order.shippingAmount ?? Math.max(order.totalAmount - subtotal, 0);
  return { subtotal, shippingAmount, totalAmount: order.totalAmount };
}

// ---------------------------------------------------------------------------
// Lecture (admin)
// ---------------------------------------------------------------------------

export function listAdminOrders(where?: Prisma.OrderWhereInput) {
  return prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" } });
}

export function getAdminOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

// Verrouille la ligne de commande jusqu'à la fin de la transaction : deux
// actions admin simultanées (double clic, deux onglets) s'exécutent l'une
// après l'autre (pas de double restitution de stock).
async function lockOrder(tx: TransactionClient, id: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
  if (locked.length === 0) throw new ApiError(404, "Commande introuvable.");
  return tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
}

// ---------------------------------------------------------------------------
// Transitions de statut (admin)
// ---------------------------------------------------------------------------
//
//   PENDING/UNPAID ──confirm-payment──▶ CONFIRMED/PAID ──set-status──▶ PREPARING ▶ SHIPPED ▶ DELIVERED
//        │                                   │ (retour arrière possible entre statuts de préparation)
//        └────────────── cancel ─────────────┴──▶ CANCELLED (+ stock restitué, PAID → REFUNDED)
//
// - Une commande annulée est figée (ni confirmation, ni changement de statut).
// - Une commande livrée ne peut plus être annulée.
// - Les statuts de préparation exigent un paiement confirmé.

export const FULFILLMENT_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

// Confirme le paiement. Le stock a déjà été décrémenté à la commande : on ne
// touche donc pas au stock ici. Idempotent (si déjà payée) ; refuse une
// commande annulée.
export async function confirmOrderPayment(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (order.status === OrderStatus.CANCELLED) {
      throw new ApiError(409, "Cette commande a été annulée et ne peut plus être confirmée.", { code: "ORDER_NOT_CONFIRMABLE" });
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    }
    return tx.order.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: order.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : order.status,
      },
      include: orderInclude,
    });
  });
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  if (!FULFILLMENT_STATUSES.includes(status)) throw new ApiError(422, "Statut de commande invalide.", { code: "INVALID_STATUS" });
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (order.status === OrderStatus.CANCELLED) {
      throw new ApiError(409, "Cette commande est annulée : son statut ne peut plus être modifié.", { code: "ORDER_CANCELLED" });
    }
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new ApiError(409, "Confirmez d'abord le paiement de cette commande.", { code: "PAYMENT_REQUIRED" });
    }
    if (order.status === status) return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    return tx.order.update({ where: { id }, data: { status }, include: orderInclude });
  });
}

// Annule une commande : restitue le stock (qui avait été décrémenté à la
// commande) et passe le paiement en remboursé s'il avait été encaissé.
// Idempotent et sûr en concurrence (ligne verrouillée) : ne restitue jamais
// deux fois.
export async function cancelOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (order.status === OrderStatus.CANCELLED) {
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    }
    if (order.status === OrderStatus.DELIVERED) {
      throw new ApiError(409, "Une commande livrée ne peut plus être annulée.", { code: "ORDER_DELIVERED" });
    }
    for (const item of order.items) {
      await tx.productVariant.updateMany({
        where: { productId: item.productId, volume: item.volume },
        data: { stock: { increment: item.quantity } },
      });
    }
    return tx.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : order.paymentStatus,
      },
      include: orderInclude,
    });
  });
}

// ---------------------------------------------------------------------------
// Création (site public)
// ---------------------------------------------------------------------------

function isReferenceConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.includes("reference") : String(target ?? "").includes("reference");
}

function normalizeAddress(address: OrderInput["deliveryAddress"]) {
  return {
    ...address,
    postalCode: isFrance(address.country) ? address.postalCode.replace(/\s+/g, "") : address.postalCode.toUpperCase(),
  };
}

async function createOrderOnce(input: OrderInput, lines: ReturnType<typeof mergeOrderLines>, reference: string) {
  return prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: {
        OR: lines.map((line) => ({ product: { slug: line.slug }, volume: { equals: line.volume, mode: "insensitive" as const } })),
      },
      include: { product: { select: { id: true, name: true, slug: true, isActive: true } } },
    });

    const resolved = lines.map((line) => {
      const variant = variants.find((candidate) => candidate.product.slug === line.slug && candidate.volume.toLowerCase() === line.volume.toLowerCase());
      if (!variant || !variant.isActive || !variant.product.isActive) {
        throw new ApiError(409, `Article indisponible : ${variant?.product.name ?? line.slug} · ${line.volume}`, {
          code: "UNAVAILABLE",
          item: { slug: line.slug, volume: line.volume },
        });
      }
      return { line, variant };
    });

    // Décrément atomique et conditionnel (stock >= quantité) : impossible de
    // vendre plus que le stock, même avec des commandes simultanées. Ordre de
    // verrouillage stable (tri par id) pour éviter les interblocages.
    const lockOrderLines = [...resolved].sort((a, b) => a.variant.id.localeCompare(b.variant.id));
    for (const { line, variant } of lockOrderLines) {
      const updated = await tx.productVariant.updateMany({
        where: { id: variant.id, isActive: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count === 0) {
        const current = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
        const available = Math.max(current?.stock ?? 0, 0);
        const label = `${variant.product.name} · ${variant.volume}`;
        throw new ApiError(
          409,
          available > 0
            ? `Stock insuffisant pour ${label} : ${available} disponible${available > 1 ? "s" : ""}.`
            : `Stock insuffisant pour ${label} : cet article est épuisé.`,
          { code: "OUT_OF_STOCK", item: { slug: line.slug, volume: variant.volume, available } },
        );
      }
    }

    // Prix et libellés EXCLUSIVEMENT issus de la base.
    const lineItems = resolved.map(({ line, variant }) => ({
      productId: variant.productId,
      name: variant.product.name,
      volume: variant.volume,
      quantity: line.quantity,
      price: variant.price,
    }));

    const subtotalAmount = lineItems.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const shippingAmount = computeShipping(subtotalAmount);

    return tx.order.create({
      data: {
        reference,
        email: input.email,
        subtotalAmount,
        shippingAmount,
        totalAmount: subtotalAmount + shippingAmount,
        currency: "eur",
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        deliveryAddress: normalizeAddress(input.deliveryAddress) as unknown as Prisma.InputJsonValue,
        items: { create: lineItems },
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
  }, { timeout: 15_000, maxWait: 10_000 });
}

// Crée une commande de façon sûre :
// - lignes identiques fusionnées, quantité limitée par article ;
// - produit ET contenance doivent être actifs ;
// - prix et noms proviennent EXCLUSIVEMENT de la base (montant infalsifiable) ;
// - stock décrémenté de manière atomique et conditionnelle ;
// - frais de port calculés côté serveur (offerts dès 50 €) ;
// - référence lisible unique (nouvel essai en cas de collision).
export async function createOrder(input: OrderInput) {
  const lines = mergeOrderLines(input.items);
  for (const line of lines) {
    if (line.quantity > MAX_QUANTITY_PER_LINE) {
      throw new ApiError(422, `La quantité est limitée à ${MAX_QUANTITY_PER_LINE} exemplaires par article.`, {
        code: "QUANTITY_LIMIT",
        item: { slug: line.slug, volume: line.volume },
      });
    }
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      const order = await createOrderOnce(input, lines, generateOrderReference());
      return { ...order, reference: order.reference ?? orderReference(order), subtotal: order.subtotalAmount };
    } catch (error) {
      if (attempt < 5 && isReferenceConflict(error)) continue;
      throw error;
    }
  }
}

// Conservé pour compatibilité : traduit une erreur en { status, message }.
export function orderApiError(error: unknown) {
  if (error instanceof ApiError) return { status: error.status, message: error.message };
  if (error instanceof Error) {
    if (error.message.includes("Stock insuffisant") || error.message.includes("indisponible")) {
      return { status: 409, message: error.message };
    }
    if (error.message === "INVALID_STATUS") return { status: 422, message: "Statut de commande invalide." };
    if (error.message === "ORDER_NOT_CONFIRMABLE") {
      return { status: 409, message: "Cette commande a été annulée et ne peut plus être confirmée." };
    }
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, message: "Conflit de données." };
    if (error.code === "P2025") return { status: 404, message: "Commande introuvable." };
  }
  return { status: 500, message: "Une erreur inattendue est survenue." };
}
