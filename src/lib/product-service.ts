import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductInput } from "@/lib/product-validation";

const productInclude = { variants: { orderBy: { price: "asc" as const } } };

export function listAdminProducts() {
  return prisma.product.findMany({ include: productInclude, orderBy: { updatedAt: "desc" } });
}

export function getAdminProduct(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude });
}

export function createAdminProduct(input: ProductInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description,
      story: input.story,
      images: input.images,
      notesTop: input.notesTop,
      notesHeart: input.notesHeart,
      notesBase: input.notesBase,
      isActive: input.isActive,
      variants: { create: input.variants },
    },
    include: productInclude,
  });
}

export async function updateAdminProduct(id: string, input: ProductInput) {
  return prisma.$transaction(async (transaction) => {
    await transaction.productVariant.deleteMany({ where: { productId: id } });
    return transaction.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        category: input.category,
        description: input.description,
        story: input.story,
        images: input.images,
        notesTop: input.notesTop,
        notesHeart: input.notesHeart,
        notesBase: input.notesBase,
        isActive: input.isActive,
        variants: { create: input.variants },
      },
      include: productInclude,
    });
  });
}

export function setAdminProductStatus(id: string, isActive: boolean) {
  return prisma.product.update({ where: { id }, data: { isActive }, include: productInclude });
}

export function deleteAdminProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

export function productApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, message: "Un produit, un slug ou un SKU utilise déjà cette valeur." };
    if (error.code === "P2025") return { status: 404, message: "Produit introuvable." };
    if (error.code === "P2003") return { status: 409, message: "Ce produit appartient à une commande. Dépubliez-le au lieu de le supprimer." };
  }
  return { status: 500, message: "Une erreur inattendue est survenue." };
}
