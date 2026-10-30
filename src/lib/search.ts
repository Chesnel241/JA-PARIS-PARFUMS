import { allNotes, type MaisonItem } from "@/lib/maison";

// Recherche instantanée côté client : produits (nom, notes, famille, heure,
// moment) et entrées éditoriales de la maison. Aucune requête serveur.

export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase()
    .trim();

export type SearchEntry = {
  title: string;
  sub: string;
  href: string;
  /** Nom normalisé (bonus de pertinence). */
  name: string;
  haystack: string;
  notes: string[];
  slug?: string;
};

const PAGES: Omit<SearchEntry, "name" | "haystack">[] = [
  { title: "Trouver mon heure", sub: "Le quiz en 4 questions", href: "/trouver-mon-heure", notes: [] },
  { title: "Les Ors", sub: "Bijoux en laiton doré", href: "/accessoires", notes: [] },
  { title: "Le Cercle JAE", sub: "Programme ambassadeurs", href: "/ambassadrices", notes: [] },
  { title: "Le Journal", sub: "Conseils, matières et coulisses", href: "/journal", notes: [] },
];

const PAGE_KEYWORDS: Record<string, string> = {
  "/trouver-mon-heure": "quiz trouver heure conseil choisir aide test",
  "/accessoires": "ors bijou bijoux boucles oreilles laiton dore accessoire accessoires",
  "/ambassadrices": "cercle ambassadeur ambassadrice ambassadeurs candidature programme",
  "/journal": "journal conseil conseils vaporiser tenue sillage porter article histoires",
};

export function buildSearchIndex(items: MaisonItem[]): SearchEntry[] {
  const products = items.map((item): SearchEntry => {
    const notes = allNotes(item);
    const isAccessory = item.category === "ACCESSOIRE";
    const kind = isAccessory ? "accessoire accessoires bijou bijoux ors laiton" : "parfum parfums eau de parfum fragrance";
    const sub = isAccessory
      ? ["Les Ors", item.tagline].filter(Boolean).join(" · ")
      : ["Eau de parfum", item.hour, item.family].filter(Boolean).join(" · ");
    return {
      title: item.name,
      sub,
      href: `/produit/${item.slug}`,
      slug: item.slug,
      notes,
      name: normalize(item.name),
      haystack: normalize([item.name, item.family, item.moment, item.tagline, item.hour ?? "", ...notes, kind, item.variants.map((variant) => variant.volume).join(" ")].join(" ")),
    };
  });
  const pages = PAGES.map((page) => ({ ...page, name: normalize(page.title), haystack: normalize(`${page.title} ${page.sub} ${PAGE_KEYWORDS[page.href] ?? ""}`) }));
  return [...products, ...pages];
}

export function searchIndex(index: SearchEntry[], query: string): SearchEntry[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return index
    .filter((entry) => tokens.every((token) => entry.haystack.includes(token)))
    .map((entry) => ({
      entry,
      score: tokens.reduce((sum, token) => sum + (entry.name.startsWith(token) ? 3 : entry.name.includes(token) ? 2 : 0), 0) + (entry.slug ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}

/** « Contient néroli » quand la recherche correspond à une note. */
export function matchedNote(entry: SearchEntry, query: string): string | null {
  const needle = normalize(query);
  if (!needle) return null;
  return entry.notes.find((note) => normalize(note).includes(needle)) ?? null;
}

/** Notes les plus présentes dans la collection (suggestions). */
export function noteSuggestions(items: MaisonItem[], limit = 5): string[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const note of allNotes(item)) counts.set(note, (counts.get(note) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([note]) => note.toLocaleLowerCase("fr-FR"));
}
