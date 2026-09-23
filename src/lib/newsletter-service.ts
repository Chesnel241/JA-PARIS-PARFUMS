import { prisma } from "@/lib/prisma";

// Le schéma vit dans newsletter-validation.ts (utilisable côté client) ; il est
// ré-exporté ici pour compatibilité.
export { newsletterInputSchema, type NewsletterInput } from "@/lib/newsletter-validation";

// Idempotent : une adresse déjà inscrite ne provoque pas d'erreur.
export function subscribeToNewsletter(email: string) {
  return prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email }, select: { id: true } });
}

export function listNewsletterSubscribers() {
  return prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
}

export function countNewsletterSubscribers() {
  return prisma.newsletterSubscriber.count();
}

export function deleteNewsletterSubscriber(id: string) {
  return prisma.newsletterSubscriber.delete({ where: { id } });
}
