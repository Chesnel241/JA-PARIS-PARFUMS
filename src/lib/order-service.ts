import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderInput } from "@/lib/order-validation";
import { computeShipping } from "@/lib/shipping";

// Crée une commande de façon sûre :
// - le prix et le nom proviennent EXCLUSIVEMENT de la base (le client ne peut
//   pas falsifier le montant) ;
// - le stock est décrémenté de manière atomique et conditionnelle (refus si
//   insuffisant, jamais de stock négatif) ;
// - les frais de port sont calculés côté serveur (offerts dès 50 €).
export async function createOrder(input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    const lineItems: { productId: string; name: string; volume: string; quantity: number; price: number }[] = [];

    for (const item of input.items) {
      const variant = await tx.productVariant.findFirst({
        where: { product: { slug: item.slug }, volume: item.volume, isActive: true },
        include: { product: true },
      });

      if (!variant) {
        throw new Error(`Article indisponible : ${item.name} · ${item.volume}`);
      }
      if (variant.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${variant.product.name} · ${item.volume}`);
      }

      lineItems.push({
        productId: variant.productId,
        name: variant.product.name,
        volume: variant.volume,
        quantity: item.quantity,
        price: variant.price,
      });
    }

    // Décrément atomique : la condition stock >= quantité empêche toute survente
    // même en cas de commandes concurrentes.
    for (const line of lineItems) {
      const updated = await tx.productVariant.updateMany({
        where: { productId: line.productId, volume: line.volume, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count === 0) {
        throw new Error(`Stock insuffisant pour ${line.name} · ${line.volume}`);
      }
    }

    const subtotal = lineItems.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const totalAmount = subtotal + computeShipping(subtotal);

    return tx.order.create({
      data: {
        email: input.email,
        totalAmount,
        currency: "eur",
        status: "PENDING",
        paymentStatus: "UNPAID",
        deliveryAddress: input.deliveryAddress as unknown as Prisma.InputJsonValue,
        items: { create: lineItems },
      },
      include: { items: true },
    });
  });
}

export function orderApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Stock insuffisant")) return { status: 409, message: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, message: "Conflit de données." };
    if (error.code === "P2025") return { status: 404, message: "Ressource introuvable." };
  }
  return { status: 500, message: "Une erreur inattendue est survenue." };
}
