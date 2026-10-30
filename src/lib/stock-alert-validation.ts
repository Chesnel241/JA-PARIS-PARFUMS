import { z } from "zod";
import "@/lib/zod-fr";

// Schéma isolé (sans Prisma) : importable depuis un composant client.
export const stockAlertInputSchema = z.object({
  email: z
    .string({ error: "Adresse e-mail invalide." })
    .trim()
    .toLowerCase()
    .max(160, "Adresse e-mail invalide.")
    .email("Adresse e-mail invalide."),
  slug: z.string().trim().toLowerCase().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  volume: z.string().trim().min(1).max(32),
  // Pot de miel anti-robots (champ invisible côté formulaire).
  website: z.string().max(200).optional(),
});

export type StockAlertInput = z.infer<typeof stockAlertInputSchema>;
