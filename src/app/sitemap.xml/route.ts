import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaeparis.com";
  let products: { slug: string }[] = [];
  let articles: { slug: string }[] = [];

  try {
    products = await prisma.product.findMany({ where: { isActive: true }, select: { slug: true } });
    articles = await prisma.article.findMany({ where: { isPublished: true }, select: { slug: true } });
  } catch {
    // Graceful fallback if database is unavailable during build
  }

  const urls = [
    { loc: `${baseUrl}/`, lastmod: new Date().toISOString().split("T")[0], changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/boutique`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.9" },
    { loc: `${baseUrl}/accessoires`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.9" },
    { loc: `${baseUrl}/journal`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.7" },
    { loc: `${baseUrl}/ambassadrices`, lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.6" },
    { loc: `${baseUrl}/boutiques`, lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.6" },
    ...products.map((p) => ({ loc: `${baseUrl}/produit/${p.slug}`, lastmod: new Date().toISOString().split("T")[0], changefreq: "weekly", priority: "0.8" })),
    ...articles.map((a) => ({ loc: `${baseUrl}/journal/${a.slug}`, lastmod: new Date().toISOString().split("T")[0], changefreq: "monthly", priority: "0.6" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
}
