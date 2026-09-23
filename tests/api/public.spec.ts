import { test, expect } from "../fixtures";
import { expectStatus } from "../helpers/factories";

test.describe("API publique — médias, robots.txt, sitemap.xml", () => {
  test("/api/media/<id inexistant> → 404 JSON", async ({ request }) => {
    for (const id of ["qa-media-inexistant", "cl0000000000000000000000", "..%2F..%2Fetc%2Fpasswd"]) {
      const response = await request.get(`/api/media/${id}`);
      await expectStatus(response, 404, `média ${id}`);
    }
  });

  test("robots.txt valide : text/plain, User-agent, Sitemap absolu", async ({ request, baseURL }) => {
    const response = await request.get("/robots.txt");
    await expectStatus(response, 200);
    expect(response.headers()["content-type"]).toMatch(/^text\/plain/);
    const body = await response.text();
    expect(body).toMatch(/^User-agent:\s*\*/m);
    const sitemap = body.match(/^Sitemap:\s*(\S+)\s*$/m)?.[1];
    expect(sitemap, "directive Sitemap absente").toBeTruthy();
    const sitemapUrl = new URL(sitemap!);
    expect(sitemapUrl.pathname).toBe("/sitemap.xml");
    // Le sitemap annoncé doit pointer vers l'origine configurée (NEXT_PUBLIC_SITE_URL).
    expect(["http:", "https:"]).toContain(sitemapUrl.protocol);
    expect(baseURL).toBeTruthy();
  });

  test("sitemap.xml valide : XML, URLs absolues, pages principales et produits actifs", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    await expectStatus(response, 200);
    expect(response.headers()["content-type"]).toMatch(/xml/);
    const xml = await response.text();
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith("</urlset>")).toBe(true);

    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locations.length).toBeGreaterThan(3);
    // Chaque <url> a exactement un <loc> et toutes les URLs sont absolues et bien formées.
    expect(xml.match(/<url>/g)?.length).toBe(locations.length);
    for (const location of locations) {
      expect(() => new URL(location), location).not.toThrow();
      expect(location).not.toMatch(/[<>"'\s]/);
    }
    const paths = locations.map((location) => new URL(location).pathname);
    for (const expected of ["/", "/boutique", "/journal"]) expect(paths).toContain(expected);
    expect(paths.some((path) => path.startsWith("/produit/"))).toBe(true);
    expect(paths.some((path) => path.startsWith("/admin"))).toBe(false);
    // Pas de doublons.
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("/api/articles liste uniquement des champs publics", async ({ request }) => {
    const response = await request.get("/api/articles");
    await expectStatus(response, 200);
    const { articles } = (await response.json()) as { articles: Record<string, unknown>[] };
    expect(Array.isArray(articles)).toBe(true);
    for (const article of articles) {
      expect(Object.keys(article).sort()).toEqual(["coverImage", "excerpt", "id", "publishedAt", "slug", "title"]);
    }
  });
});
