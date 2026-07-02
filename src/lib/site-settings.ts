import { prisma } from "@/lib/prisma";

// Emplacements d'images du site modifiables depuis l'admin (/admin/apparence).
// Chaque emplacement a une valeur par défaut : le site fonctionne sans réglage.
export const IMAGE_SLOTS = [
  { key: "home.hero.image", label: "Accueil — image du héro", description: "Grande image de la mannequin en haut de la page d'accueil (PNG détouré conseillé).", defaultValue: "/hero-nobg.png" },
  { key: "home.hero.card", label: "Accueil — carte flottante", description: "Petite carte visuelle posée sur le héro.", defaultValue: "/craft.jpg" },
  { key: "home.banner.image", label: "Accueil — bannière Illusion", description: "Grande bannière pleine largeur au centre de la page d'accueil.", defaultValue: "/bestseller.jpg" },
  { key: "home.craft.image", label: "Accueil — le geste (savoir-faire)", description: "Image de la section « La matière avant tout ».", defaultValue: "/craft.jpg" },
  { key: "home.essence.image", label: "Accueil — l'inspiration", description: "Image de la section « L'art de sublimer votre essence ».", defaultValue: "/essence.jpg" },
  { key: "home.newsletter.image", label: "Accueil — le cercle JAE", description: "Image de fond du bloc newsletter en bas de page.", defaultValue: "/newsletter.jpg" },
] as const;

export type ImageSlotKey = (typeof IMAGE_SLOTS)[number]["key"];

export const IMAGE_SLOT_KEYS = IMAGE_SLOTS.map((slot) => slot.key) as ImageSlotKey[];

export type SiteImages = Record<ImageSlotKey, string>;

// Renvoie les images du site (défauts + surcharges admin). Ne plante jamais :
// en cas de base indisponible, les valeurs par défaut sont servies.
export async function getSiteImages(): Promise<SiteImages> {
  const images = Object.fromEntries(IMAGE_SLOTS.map((slot) => [slot.key, slot.defaultValue])) as SiteImages;
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: IMAGE_SLOT_KEYS } } });
    for (const row of rows) {
      if (row.value.trim()) images[row.key as ImageSlotKey] = row.value;
    }
  } catch (error) {
    console.error("[settings] getSiteImages a échoué :", error);
  }
  return images;
}

export function setSiteSetting(key: string, value: string) {
  return prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function deleteSiteSetting(key: string) {
  return prisma.siteSetting.deleteMany({ where: { key } });
}
