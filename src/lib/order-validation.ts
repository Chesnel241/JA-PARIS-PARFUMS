import { z } from "zod";
import "@/lib/zod-fr";

// Quantité maximale d'un même article (slug + contenance) par commande.
export const MAX_QUANTITY_PER_LINE = 10;
// Nombre maximal de lignes distinctes par commande.
export const MAX_ORDER_LINES = 30;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Le client envoie aussi nom, image et prix (affichage du panier) : ces champs
// sont acceptés mais IGNORÉS. Seuls slug + contenance + quantité comptent ; le
// prix et le nom sont relus en base.
export const orderItemInputSchema = z.object({
  slug: z.string({ error: "Article invalide." }).trim().toLowerCase().min(1, "Article invalide.").max(140, "Article invalide.").regex(SLUG_PATTERN, "Article invalide."),
  volume: z.string({ error: "Contenance invalide." }).trim().min(1, "Contenance invalide.").max(32, "Contenance invalide."),
  quantity: z
    .number({ error: "La quantité doit être un nombre entier." })
    .int("La quantité doit être un nombre entier.")
    .min(1, "La quantité doit être d'au moins 1.")
    .max(MAX_QUANTITY_PER_LINE, `La quantité est limitée à ${MAX_QUANTITY_PER_LINE} par article.`),
  name: z.string().max(200).optional(),
  image: z.string().max(1000).optional(),
  price: z.number().optional(),
});

const optionalTrimmed = (schema: z.ZodString) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());

const FRENCH_COUNTRY_NAMES = new Set(["france", "fr", "france métropolitaine", "france metropolitaine"]);

export function isFrance(country: string) {
  return FRENCH_COUNTRY_NAMES.has(country.trim().toLowerCase());
}

// Téléphone : chiffres, espaces, points, tirets, parenthèses, « + » initial ;
// entre 6 et 15 chiffres (norme E.164).
const PHONE_PATTERN = /^\+?[0-9 .()-]{6,25}$/;

export const deliveryAddressSchema = z
  .object({
    firstName: z.string({ error: "Le prénom est requis." }).trim().min(1, "Le prénom est requis.").max(100, "Le prénom est trop long."),
    lastName: z.string({ error: "Le nom est requis." }).trim().min(1, "Le nom est requis.").max(100, "Le nom est trop long."),
    address: z.string({ error: "L'adresse est requise." }).trim().min(3, "L'adresse est incomplète.").max(200, "L'adresse est trop longue."),
    address2: optionalTrimmed(z.string().trim().max(200, "Le complément d'adresse est trop long.")),
    city: z.string({ error: "La ville est requise." }).trim().min(1, "La ville est requise.").max(100, "Le nom de ville est trop long."),
    postalCode: z.string({ error: "Le code postal est requis." }).trim().min(1, "Le code postal est requis.").max(12, "Code postal invalide."),
    country: z.string().trim().min(2, "Le pays est requis.").max(100, "Le nom de pays est trop long.").default("France"),
    phone: optionalTrimmed(
      z.string().trim().max(30, "Numéro de téléphone invalide.").regex(PHONE_PATTERN, "Numéro de téléphone invalide.")
        .refine((value) => {
          const digits = value.replace(/\D/g, "").length;
          return digits >= 6 && digits <= 15;
        }, "Numéro de téléphone invalide."),
    ),
  })
  .superRefine((address, context) => {
    const postalCode = address.postalCode.replace(/\s+/g, "");
    const valid = isFrance(address.country) ? /^\d{5}$/.test(postalCode) : /^[A-Za-z0-9-]{2,10}$/.test(postalCode);
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: isFrance(address.country) ? "Le code postal doit comporter 5 chiffres." : "Code postal invalide.",
      });
    }
  });

export const orderInputSchema = z.object({
  email: z
    .string({ error: "L'adresse e-mail est requise." })
    .trim()
    .toLowerCase()
    .max(254, "Adresse e-mail invalide.")
    .email("Adresse e-mail invalide."),
  items: z
    .array(orderItemInputSchema, { error: "Votre panier est vide." })
    .min(1, "Votre panier est vide.")
    .max(MAX_ORDER_LINES, `Une commande est limitée à ${MAX_ORDER_LINES} articles différents.`),
  deliveryAddress: deliveryAddressSchema,
});

export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type DeliveryAddressInput = z.infer<typeof deliveryAddressSchema>;

// Fusionne les lignes identiques (même slug + même contenance, casse ignorée)
// en additionnant les quantités.
export function mergeOrderLines(items: Pick<OrderItemInput, "slug" | "volume" | "quantity">[]) {
  const merged = new Map<string, { slug: string; volume: string; quantity: number }>();
  for (const item of items) {
    const key = `${item.slug}\u0000${item.volume.toLowerCase()}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { slug: item.slug, volume: item.volume, quantity: item.quantity });
  }
  return [...merged.values()];
}
