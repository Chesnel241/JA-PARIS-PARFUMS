import { prisma } from "@/lib/prisma";

// Emplacements d'images du site modifiables depuis l'admin (/admin/apparence).
// Chaque emplacement a une valeur par défaut : le site fonctionne sans réglage.
export const IMAGE_SLOTS = [
  { key: "home.hero.image", label: "Accueil — héro", description: "Grande image du haut de page (PNG détouré ou photo portrait).", defaultValue: "/hero-nobg.png" },
  { key: "home.hero.card", label: "Accueil — tuile Parfums", description: "Image de la tuile d'entrée « Parfums » (portrait 4:5).", defaultValue: "/hero.jpg" },
  { key: "home.banner.image", label: "Accueil — bannière signature", description: "Grande bannière au centre de l'accueil ; sert aussi d'image de partage.", defaultValue: "/bestseller.jpg" },
  { key: "home.craft.image", label: "Accueil — tuile Accessoires", description: "Image de la tuile d'entrée « Accessoires » (portrait 4:5).", defaultValue: "/craft.jpg" },
  { key: "home.essence.image", label: "Accueil — tuile Devenir ambassadrice", description: "Image de la tuile « Devenir ambassadrice » et du formulaire de candidature.", defaultValue: "/essence.jpg" },
  { key: "home.newsletter.image", label: "Accueil — newsletter", description: "Image du bloc newsletter en bas de page.", defaultValue: "/newsletter.jpg" },
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
