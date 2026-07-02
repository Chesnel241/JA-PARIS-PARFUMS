import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/article-service";

// Liste publique (lecture seule) des articles publiés du Journal.
export async function GET() {
  const articles = await getPublishedArticles();
  return NextResponse.json({
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      publishedAt: article.publishedAt,
    })),
  });
}
