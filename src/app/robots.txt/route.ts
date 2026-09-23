import { getSiteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  // Les déploiements de prévisualisation Vercel ne doivent jamais être indexés.
  const isPreview = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

  const body = isPreview
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *
Allow: /
Allow: /api/media/
Disallow: /admin
Disallow: /api/
Disallow: /connexion-admin
Disallow: /panier
Disallow: /compte

Sitemap: ${getSiteUrl()}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
