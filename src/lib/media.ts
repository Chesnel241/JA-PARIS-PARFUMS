import { prisma } from "@/lib/prisma";
import { IMAGE_SLOTS } from "@/lib/site-settings";

// 4 Mo : sous la limite de corps de requête des fonctions Vercel (4,5 Mo).
export const MAX_MEDIA_SIZE = 4 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type MediaMimeType = (typeof ALLOWED_MEDIA_TYPES)[number];

const EXTENSIONS: Record<MediaMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const MEDIA_URL_PREFIX = "/api/media/";

export function mediaUrl(id: string) {
  return `${MEDIA_URL_PREFIX}${id}`;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

// Détecte le format RÉEL d'une image d'après sa signature binaire (« magic
// bytes ») — le type MIME déclaré par le navigateur n'est jamais cru.
// SVG, HTML, PDF et tout le reste sont refusés (null).
export function detectImageType(bytes: Uint8Array): MediaMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) return "image/gif";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  // AVIF : boîte ISO-BMFF « ftyp » dont la marque (majeure ou compatible) est avif/avis.
  if (bytes.length >= 16 && ascii(bytes, 4, 8) === "ftyp") {
    const declaredSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    const boxSize = Math.min(declaredSize, bytes.length, 256);
    for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
      if (offset === 12) continue; // version mineure
      const brand = ascii(bytes, offset, offset + 4);
      if (brand === "avif" || brand === "avis") return "image/avif";
    }
  }
  return null;
}

// Nom de fichier assaini : sans chemin, sans caractères de contrôle ni
// caractères spéciaux, longueur bornée, extension cohérente avec le format réel.
export function sanitizeFilename(original: string, mimeType: MediaMimeType) {
  const base = original.split(/[\\/]/).pop() ?? "";
  const withoutExtension = base.replace(/\.[^.]*$/, "");
  const cleaned = withoutExtension
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "-")
    .replace(/\s+/g, " ")
    .replace(/-{2,}/g, "-")
    .replace(/^[\s.-]+|[\s.-]+$/g, "")
    .slice(0, 100);
  return `${cleaned || "image"}.${EXTENSIONS[mimeType]}`;
}

// ---------------------------------------------------------------------------
// Usages d'un média (avant suppression)
// ---------------------------------------------------------------------------

export type MediaUsage = {
  type: "product" | "article" | "setting" | "ambassador" | "store";
  id: string;
  label: string;
  adminUrl: string;
};

export async function findMediaUsages(id: string): Promise<MediaUsage[]> {
  // Correspond à « /api/media/<id> » (chemin relatif ou URL absolue), sans
  // confondre avec un identifiant plus long qui commencerait pareil.
  const pattern = `/api/media/${id}([^A-Za-z0-9_-]|$)`;
  const contains = `/api/media/${id}`;

  const [products, articles, settings, ambassadors, stores] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT "id", "name" FROM "Product"
      WHERE EXISTS (SELECT 1 FROM unnest("images") AS image WHERE image ~ ${pattern})
      ORDER BY "name"`,
    prisma.article.findMany({
      where: { OR: [{ coverImage: { contains } }, { content: { contains } }] },
      select: { id: true, title: true, coverImage: true, content: true },
      orderBy: { title: "asc" },
    }),
    prisma.siteSetting.findMany({ where: { value: { contains } }, select: { key: true, value: true } }),
    prisma.ambassador.findMany({ where: { photo: { contains } }, select: { id: true, name: true, photo: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: { image: { contains } }, select: { id: true, name: true, image: true }, orderBy: { name: "asc" } }),
  ]);

  // `contains` (SQL LIKE) est un pré-filtre ; la regex confirme la
  // correspondance exacte de l'identifiant.
  const exact = new RegExp(pattern);
  const slotLabels = new Map<string, string>(IMAGE_SLOTS.map((slot) => [slot.key, slot.label]));

  return [
    ...products.map((product) => ({ type: "product" as const, id: product.id, label: `Produit « ${product.name} »`, adminUrl: `/admin/produits/${product.id}` })),
    ...articles
      .filter((article) => exact.test(article.coverImage) || exact.test(article.content))
      .map((article) => ({ type: "article" as const, id: article.id, label: `Article « ${article.title} »`, adminUrl: `/admin/articles/${article.id}` })),
    ...settings
      .filter((setting) => exact.test(setting.value))
      .map((setting) => ({ type: "setting" as const, id: setting.key, label: `Apparence — ${slotLabels.get(setting.key) ?? setting.key}`, adminUrl: "/admin/apparence" })),
    ...ambassadors
      .filter((ambassador) => exact.test(ambassador.photo))
      .map((ambassador) => ({ type: "ambassador" as const, id: ambassador.id, label: `Ambassadrice « ${ambassador.name} »`, adminUrl: "/admin/ambassadrices" })),
    ...stores
      .filter((store) => exact.test(store.image))
      .map((store) => ({ type: "store" as const, id: store.id, label: `Boutique « ${store.name} »`, adminUrl: "/admin/boutiques" })),
  ];
}

export function describeMediaUsages(usages: MediaUsage[]) {
  const labels = usages.slice(0, 5).map((usage) => usage.label);
  const more = usages.length > 5 ? ` et ${usages.length - 5} autre${usages.length - 5 > 1 ? "s" : ""}` : "";
  return `Ce média est encore utilisé : ${labels.join(", ")}${more}. Remplacez-le avant de le supprimer, ou forcez la suppression.`;
}
