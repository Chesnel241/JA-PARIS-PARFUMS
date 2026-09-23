import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import { QA_PREFIX, REPO_ROOT } from "./env";

/**
 * Liste centralisée des pages publiques contrôlées par les tests de qualité /
 * responsive. Ajouter ici toute nouvelle page publique.
 * Les chemins dynamiques (`[slug]`) sont résolus à l'exécution à partir de
 * /sitemap.xml (premier élément réel, hors données de test `qa-`).
 */
export const PUBLIC_PAGES = [
  { name: "accueil", path: "/" },
  { name: "parfums", path: "/boutique" },
  { name: "accessoires", path: "/accessoires" },
  { name: "fiche produit", path: "/produit/[slug]" },
  { name: "panier", path: "/panier" },
  { name: "recherche", path: "/recherche" },
  { name: "journal", path: "/journal" },
  { name: "article du journal", path: "/journal/[slug]" },
  { name: "ambassadrices", path: "/ambassadrices" },
  { name: "boutiques", path: "/boutiques" },
  { name: "connexion admin", path: "/connexion-admin" },
] as const;

export type PublicPage = (typeof PUBLIC_PAGES)[number];

let sitemapCache: string[] | undefined;

export async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  if (sitemapCache) return sitemapCache;
  const response = await request.get("/sitemap.xml");
  expect(response.status(), "GET /sitemap.xml").toBe(200);
  const xml = await response.text();
  sitemapCache = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  return sitemapCache;
}

/** Remplace `[slug]` par un élément réel du catalogue / journal (issu du sitemap). */
export async function resolvePublicPath(request: APIRequestContext, page: PublicPage): Promise<string> {
  if (!page.path.includes("[")) return page.path;
  const prefix = page.path.replace("[slug]", "");
  const candidates = (await sitemapPaths(request)).filter(
    (candidate) => candidate.startsWith(prefix) && candidate.length > prefix.length && !candidate.slice(prefix.length).startsWith(`${QA_PREFIX}-`),
  );
  expect(candidates.length, `aucune URL ${page.path} dans le sitemap (base seedée ?)`).toBeGreaterThan(0);
  return candidates[0];
}

// ---------------------------------------------------------------------------
// Découverte des routes à partir du code source (routes futures couvertes).
// ---------------------------------------------------------------------------

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

function walk(directory: string, fileName: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full, fileName);
    return entry.name === fileName ? [full] : [];
  });
}

/** Convertit un chemin de fichier App Router en URL (groupes retirés, segments dynamiques remplacés). */
function toUrl(appDirectory: string, file: string, dynamicValue: string) {
  const segments = path
    .relative(appDirectory, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
    .map((segment) => (segment.startsWith("[") ? dynamicValue : segment));
  return `/${segments.join("/")}`;
}

/** Méthodes HTTP exportées par un fichier route.ts (fonctions, const, déstructuration, ré-exports). */
export function exportedMethods(source: string): HttpMethod[] {
  const found = new Set<HttpMethod>();
  const isMethod = (name: string): name is HttpMethod => (HTTP_METHODS as readonly string[]).includes(name);
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Z]+)\b/g)) if (isMethod(match[1])) found.add(match[1]);
  for (const match of source.matchAll(/export\s+(?:const|let|var)\s+([A-Z]+)\s*=/g)) if (isMethod(match[1])) found.add(match[1]);
  for (const match of source.matchAll(/export\s+(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const name of match[1].split(",").map((part) => part.split(":").pop()!.trim())) if (isMethod(name)) found.add(name);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const name of match[1].split(",").map((part) => part.split(/\s+as\s+/).pop()!.trim())) if (isMethod(name)) found.add(name);
  }
  return [...found];
}

export type DiscoveredRoute = { file: string; url: string; methods: HttpMethod[] };

/** Toutes les routes API sous `src/app/api/<sousDossier>` avec leurs méthodes. */
export function discoverApiRoutes(subDirectory: string, dynamicValue = "qa-id-inexistant"): DiscoveredRoute[] {
  const appDirectory = path.join(REPO_ROOT, "src", "app");
  return walk(path.join(appDirectory, "api", subDirectory), "route.ts")
    .sort()
    .map((file) => ({
      file: path.relative(REPO_ROOT, file),
      url: toUrl(appDirectory, file, dynamicValue),
      methods: exportedMethods(fs.readFileSync(file, "utf8")),
    }));
}

/** Toutes les pages (page.tsx) sous `src/app/<sousDossier>`. */
export function discoverPages(subDirectory: string, dynamicValue = "qa-id-inexistant"): string[] {
  const appDirectory = path.join(REPO_ROOT, "src", "app");
  return walk(path.join(appDirectory, subDirectory), "page.tsx")
    .sort()
    .map((file) => toUrl(appDirectory, file, dynamicValue));
}
