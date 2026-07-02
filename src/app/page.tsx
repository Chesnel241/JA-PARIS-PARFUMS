import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { getPublishedArticles } from "@/lib/article-service";
import { getSiteImages } from "@/lib/site-settings";
import { HomeContent } from "./home-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, accessories, siteImages, articles] = await Promise.all([
    getPublicProducts(ProductCategory.PARFUM),
    getPublicProducts(ProductCategory.ACCESSOIRE),
    getSiteImages(),
    getPublishedArticles(3),
  ]);
  return (
    <HomeContent
      products={products}
      accessories={accessories}
      siteImages={siteImages}
      articles={articles.map((article) => ({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        date: article.publishedAt
          ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(article.publishedAt)
          : "",
      }))}
    />
  );
}
