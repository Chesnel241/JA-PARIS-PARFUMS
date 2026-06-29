import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || "https://jaeparis.com"}/sitemap.xml
`;
  return new NextResponse(body, { headers: { "Content-Type": "text/plain" } });
}
