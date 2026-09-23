import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ArticleInput } from "@/lib/article-validation";

export function listAdminArticles() {
  return prisma.article.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getAdminArticle(id: string) {
  return prisma.article.findUnique({ where: { id } });
}

export function createAdminArticle(input: ArticleInput) {
  return prisma.article.create({
    data: { ...input, publishedAt: input.isPublished ? new Date() : null },
  });
}

export async function updateAdminArticle(id: string, input: ArticleInput) {
  const existing = await prisma.article.findUniqueOrThrow({ where: { id } });
  return prisma.article.update({
    where: { id },
    data: {
      ...input,
      // Conserve la date de première publication ; la pose si on publie.
      publishedAt: input.isPublished ? existing.publishedAt ?? new Date() : existing.publishedAt,
    },
  });
}

// Publier conserve la date de première publication (cohérent avec
// updateAdminArticle) : dépublier/republier ne fait pas « remonter » l'article.
export async function setAdminArticleStatus(id: string, isPublished: boolean) {
  const existing = await prisma.article.findUniqueOrThrow({ where: { id }, select: { publishedAt: true } });
  return prisma.article.update({
    where: { id },
    data: { isPublished, ...(isPublished && !existing.publishedAt ? { publishedAt: new Date() } : {}) },
  });
}

export function deleteAdminArticle(id: string) {
  return prisma.article.delete({ where: { id } });
}

// Côté public
export async function getPublishedArticles(limit?: number) {
  try {
    return await prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });
  } catch (error) {
    console.error("[articles] getPublishedArticles a échoué :", error);
    return [];
  }
}

export async function getPublishedArticle(slug: string) {
  try {
    return await prisma.article.findFirst({ where: { slug, isPublished: true } });
  } catch (error) {
    console.error("[articles] getPublishedArticle a échoué :", error);
    return null;
  }
}

export function articleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, message: "Un article utilise déjà ce slug." };
    if (error.code === "P2025") return { status: 404, message: "Article introuvable." };
  }
  return { status: 500, message: "Une erreur inattendue est survenue." };
}
