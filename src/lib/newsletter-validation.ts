import { z } from "zod";
import "@/lib/zod-fr";

// Schéma isolé (sans Prisma) : importable depuis un composant client.
export const newsletterInputSchema = z.object({
  email: z
    .string({ error: "Adresse e-mail invalide." })
    .trim()
    .toLowerCase()
    .max(160, "Adresse e-mail invalide.")
    .email("Adresse e-mail invalide."),
  // Pot de miel anti-robots (champ invisible côté formulaire).
  website: z.string().max(200).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterInputSchema>;
