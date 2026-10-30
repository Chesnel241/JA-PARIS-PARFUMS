import { prisma } from "@/lib/prisma";

// Emplacements d'images du site modifiables depuis l'admin (/admin/apparence).
// Chaque emplacement a une valeur par défaut : le site fonctionne sans réglage.
export const IMAGE_SLOTS = [
  { key: "home.campaign.image", label: "Accueil — photo de campagne", description: "Grande photo portrait en haut de l’accueil (format 4:5). Sert aussi d’image de partage sur les réseaux.", defaultValue: "/maison/illusion-cou.jpg" },
  { key: "home.ors.image", label: "Accueil — tuile Les Ors", description: "Petite tuile des bijoux, en haut de l’accueil (portrait).", defaultValue: "/maison/ors-flamme.jpg" },
  { key: "home.univers.ors", label: "Accueil — bloc Les Ors", description: "Grand bloc des bijoux dans « L’univers JAE » (portrait).", defaultValue: "/maison/ors-eventail.jpg" },
  { key: "home.univers.cercle", label: "Accueil — bloc Le Cercle", description: "Portrait du bloc ambassadeurs de l’accueil (portrait).", defaultValue: "/maison/cercle-portrait.jpg" },
  { key: "ors.lookbook.1", label: "Les Ors — lookbook 1", description: "Grande photo verticale (colonne 1) de la campagne Les Ors.", defaultValue: "/maison/ors-flamme.jpg" },
  { key: "ors.lookbook.2", label: "Les Ors — lookbook 2", description: "Photo carrée (colonne 2, en haut).", defaultValue: "/maison/ors-triangle.jpg" },
  { key: "ors.lookbook.3", label: "Les Ors — lookbook 3", description: "Grande photo verticale (colonne 3).", defaultValue: "/maison/ors-eventail.jpg" },
  { key: "ors.lookbook.4", label: "Les Ors — lookbook 4", description: "Grande photo verticale (colonne 4).", defaultValue: "/maison/ors-vague.jpg" },
  { key: "ors.lookbook.5", label: "Les Ors — lookbook 5", description: "Photo carrée (colonne 2, en bas).", defaultValue: "/maison/ors-goutte.jpg" },
  { key: "cercle.image", label: "Le Cercle — portrait", description: "Portrait de la page du programme ambassadeurs.", defaultValue: "/maison/cercle-portrait.jpg" },
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
