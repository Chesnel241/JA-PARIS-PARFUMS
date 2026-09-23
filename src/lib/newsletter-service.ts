import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const newsletterInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  // Pot de miel anti-robots (champ invisible côté formulaire).
  website: z.string().max(200).optional(),
});

// Idempotent : une adresse déjà inscrite ne provoque pas d'erreur.
export function subscribeToNewsletter(email: string) {
  return prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email }, select: { id: true } });
}

export function listNewsletterSubscribers() {
  return prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
}

export function deleteNewsletterSubscriber(id: string) {
  return prisma.newsletterSubscriber.delete({ where: { id } });
}
