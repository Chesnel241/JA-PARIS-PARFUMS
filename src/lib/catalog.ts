import { ProductCategory } from "@prisma/client";
import type { Product as CatalogProduct } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const catalogInclude = { variants: { where: { isActive: true }, orderBy: { price: "asc" as const } } };

function toCatalogProduct(product: Awaited<ReturnType<typeof prisma.product.findFirstOrThrow>> & { variants: { volume: string; price: number; stock: number }[] }): CatalogProduct {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    subtitle: product.category === ProductCategory.ACCESSOIRE ? "Accessoire JAE Paris" : "Parfum JAE Paris",
    description: product.description,
    story: product.story,
    image: product.images[0] ?? "/parfum-noir.svg",
    accent: "#9b6b43",
    notes: { top: product.notesTop, heart: product.notesHeart, base: product.notesBase },
    variants: product.variants,
  };
}

export async function getPublicProducts(category?: ProductCategory) {
  const products = await prisma.product.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    include: catalogInclude,
    orderBy: { createdAt: "asc" },
  });
  return products.filter((product) => product.variants.length > 0).map(toCatalogProduct);
}

export async function getPublicProduct(slug: string) {
  const product = await prisma.product.findFirst({ where: { slug, isActive: true }, include: catalogInclude });
  return product && product.variants.length > 0 ? toCatalogProduct(product) : null;
}
