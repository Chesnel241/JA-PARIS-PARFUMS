import type { Product } from "@/lib/data";
import { parseHour } from "@/lib/heures";
import { isPlaceholderImage } from "@/lib/placeholder";

// Aides d'affichage partagées serveur / client, sans dépendance serveur.

type Variant = Product["variants"][number];

/** Contenance achetable mise en avant : la moins chère en stock. */
export function buyVariant(product: Pick<Product, "variants">): Variant | null {
  return product.variants.find((variant) => variant.stock > 0) ?? null;
}

/** Contenance affichée sur les cartes : celle en stock, sinon la moins chère. */
export function shownVariant(product: Pick<Product, "variants">): Variant | null {
  return buyVariant(product) ?? product.variants[0] ?? null;
}

export function isAvailable(product: Pick<Product, "variants">) {
  return product.variants.some((variant) => variant.stock > 0);
}

export function allNotes(product: Pick<Product, "notes">) {
  return [...product.notes.top, ...product.notes.heart, ...product.notes.base];
}

/** « 19:00 · Entre chien et loup » (ou ce qui existe des deux). */
export function hourLabel(product: Pick<Product, "hour" | "moment">) {
  return [product.hour, product.moment].filter(Boolean).join(" · ");
}

/** Version allégée d'un produit pour les composants client de l'habillage. */
export type MaisonItem = Pick<Product, "slug" | "name" | "category" | "palette" | "hour" | "hourFrom" | "moment" | "tagline" | "family" | "notes" | "images" | "variants" | "description">;

export function toMaisonItem(product: Product): MaisonItem {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    palette: product.palette,
    hour: product.hour,
    hourFrom: product.hourFrom,
    moment: product.moment,
    tagline: product.tagline,
    family: product.family,
    notes: product.notes,
    images: product.images.slice(0, 2),
    variants: product.variants,
    description: product.description.slice(0, 280),
  };
}

/**
 * Ordre « de la journée » : du premier soleil (5 h) à la nuit, d'après le
 * début de créneau de chaque parfum ; les parfums sans heure ferment la marche.
 */
export function sortByDay<T extends Pick<Product, "hour" | "hourFrom">>(items: T[]): T[] {
  const key = (item: T) => {
    const value = parseHour(item.hourFrom) ?? parseHour(item.hour);
    return value === null ? Number.POSITIVE_INFINITY : (value - 300 + 1440) % 1440;
  };
  return [...items].sort((a, b) => key(a) - key(b));
}

/** Parfum mis en avant : disponible et photographié de préférence. */
export function pickFeatured<T extends Pick<Product, "variants" | "images">>(perfumes: T[]): T | null {
  const hasPhoto = (item: T) => item.images.some((image) => !isPlaceholderImage(image));
  return perfumes.find((item) => isAvailable(item) && hasPhoto(item)) ?? perfumes.find(hasPhoto) ?? perfumes.find(isAvailable) ?? perfumes[0] ?? null;
}
