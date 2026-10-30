import { cache } from "react";
import { ProductCategory } from "@prisma/client";
import type { Product as CatalogProduct } from "@/lib/data";
import { isPaletteKey, paletteOf } from "@/lib/heures";
import { isPlaceholderImage } from "@/lib/placeholder";
import { prisma } from "@/lib/prisma";

const catalogInclude = { variants: { where: { isActive: true }, orderBy: { price: "asc" as const } } };

type ProductRow = Awaited<ReturnType<typeof prisma.product.findFirstOrThrow>> & { variants: { volume: string; price: number; stock: number }[] };

function toCatalogProduct(product: ProductRow): CatalogProduct {
  const isAccessory = product.category === ProductCategory.ACCESSOIRE;
  const images = product.images.length > 0 ? product.images : ["/parfum-noir.svg"];
  const palette = isPaletteKey(product.palette) && !isAccessory ? product.palette : "";
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    subtitle: isAccessory ? "Accessoire JAE Paris" : "Eau de parfum",
    description: product.description,
    story: product.story,
    image: images[0],
    images,
    hasPhoto: images.some((image) => !isPlaceholderImage(image)),
    accent: paletteOf(palette).accent,
    notes: { top: product.notesTop, heart: product.notesHeart, base: product.notesBase },
    variants: product.variants.map(({ volume, price, stock }) => ({ volume, price, stock })),
    tagline: product.tagline,
    family: isAccessory ? "" : product.family,
    moment: isAccessory ? "" : product.moment,
    hour: isAccessory ? null : product.hour,
    hourFrom: isAccessory ? null : product.hourFrom,
    palette,
  };
}

// Dédoublonné sur la durée d'un rendu (layout + page partagent la requête).
const loadPublicProducts = cache(async (): Promise<CatalogProduct[]> => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: catalogInclude,
      orderBy: { createdAt: "asc" },
    });
    return products.filter((product) => product.variants.length > 0).map(toCatalogProduct);
  } catch (error) {
    // Ne jamais faire planter les pages publiques si la base est indisponible
    // ou non migrée : on dégrade proprement en catalogue vide.
    console.error("[catalog] getPublicProducts a échoué :", error);
    return [];
  }
});

export async function getPublicProducts(category?: ProductCategory) {
  const products = await loadPublicProducts();
  return category ? products.filter((product) => product.category === category) : products;
}

export async function getPublicProduct(slug: string) {
  try {
    const product = await prisma.product.findFirst({ where: { slug, isActive: true }, include: catalogInclude });
    return product && product.variants.length > 0 ? toCatalogProduct(product) : null;
  } catch (error) {
    console.error("[catalog] getPublicProduct a échoué :", error);
    return null;
  }
}
