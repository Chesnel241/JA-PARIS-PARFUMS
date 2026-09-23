import { getSiteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SitemapEntry = { loc: string; lastmod?: Date; changefreq: string; priority: string };

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const latest = (dates: Date[]) => (dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined);

// Sitemap généré depuis la base : produits réellement visibles (actifs avec au
// moins une contenance active), articles publiés, pages statiques.
export async function GET() {
  const baseUrl = getSiteUrl();
  let products: { slug: string; updatedAt: Date; category: string }[] = [];
  let articles: { slug: string; updatedAt: Date }[] = [];

  try {
    [products, articles] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, variants: { some: { isActive: true } } },
        select: { slug: true, updatedAt: true, category: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.article.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    ]);
  } catch (error) {
    // Base indisponible : sitemap réduit aux pages statiques plutôt qu'une erreur.
    console.error("[sitemap] lecture de la base impossible :", error);
  }

  const catalogUpdate = latest(products.map((product) => product.updatedAt));
  const perfumeUpdate = latest(products.filter((product) => product.category === "PARFUM").map((product) => product.updatedAt));
  const accessoryUpdate = latest(products.filter((product) => product.category === "ACCESSOIRE").map((product) => product.updatedAt));
  const journalUpdate = latest(articles.map((article) => article.updatedAt));

  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, lastmod: latest([catalogUpdate, journalUpdate].filter((date): date is Date => Boolean(date))), changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/boutique`, lastmod: perfumeUpdate, changefreq: "weekly", priority: "0.9" },
    { loc: `${baseUrl}/accessoires`, lastmod: accessoryUpdate, changefreq: "weekly", priority: "0.9" },
    { loc: `${baseUrl}/journal`, lastmod: journalUpdate, changefreq: "weekly", priority: "0.7" },
    { loc: `${baseUrl}/ambassadrices`, changefreq: "monthly", priority: "0.6" },
    { loc: `${baseUrl}/boutiques`, changefreq: "monthly", priority: "0.6" },
    { loc: `${baseUrl}/cgv`, changefreq: "yearly", priority: "0.3" },
    { loc: `${baseUrl}/mentions-legales`, changefreq: "yearly", priority: "0.3" },
    { loc: `${baseUrl}/confidentialite`, changefreq: "yearly", priority: "0.3" },
    ...products.map((product) => ({ loc: `${baseUrl}/produit/${encodeURIComponent(product.slug)}`, lastmod: product.updatedAt, changefreq: "weekly", priority: "0.8" })),
    ...articles.map((article) => ({ loc: `${baseUrl}/journal/${encodeURIComponent(article.slug)}`, lastmod: article.updatedAt, changefreq: "monthly", priority: "0.6" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod.toISOString()}</lastmod>` : ""}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=600" },
  });
}
