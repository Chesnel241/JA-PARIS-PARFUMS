import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderInput } from "@/lib/order-validation";

export async function createOrder(input: OrderInput) {
  return prisma.$transaction(async (tx) => {
    // Validate stock for each item and decrement
    for (const item of input.items) {
      const variant = await tx.productVariant.findFirst({
        where: {
          product: { slug: item.slug },
          volume: item.volume,
          isActive: true,
        },
      });

      if (!variant || variant.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${item.name} · ${item.volume}`);
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await tx.order.create({
      data: {
        email: input.email,
        totalAmount,
        currency: "eur",
        status: "PENDING",
        paymentStatus: "UNPAID",
        deliveryAddress: input.deliveryAddress as unknown as Prisma.InputJsonValue,
        items: {
          create: input.items.map((item) => ({
            productId: item.slug, // Will be replaced by actual product ID lookup below
            name: item.name,
            volume: item.volume,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    // Fix productId references by looking up actual product IDs
    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { slug: item.slug } });
      if (product) {
        const orderItem = order.items.find((oi) => oi.name === item.name && oi.volume === item.volume);
        if (orderItem) {
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { productId: product.id },
          });
        }
      }
    }

    return order;
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
