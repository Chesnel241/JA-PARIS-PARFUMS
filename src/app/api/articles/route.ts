import { handleApi, json } from "@/lib/api";
import { getPublishedArticles } from "@/lib/article-service";

export const dynamic = "force-dynamic";

// Liste publique (lecture seule) des articles publiés du Journal.
export async function GET() {
  return handleApi("articles:list", async () => {
    const articles = await getPublishedArticles();
    return json({
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        publishedAt: article.publishedAt,
      })),
    });
  });
}
