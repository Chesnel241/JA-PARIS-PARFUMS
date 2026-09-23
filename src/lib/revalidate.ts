import { revalidatePath } from "next/cache";

// Synchronisation admin → site public.
//
// Après chaque mutation de l'admin, on invalide les pages publiques ET admin
// concernées (cache de rendu Next.js, y compris pour une page qui deviendrait
// statique). Ne lève jamais : une invalidation ratée ne doit pas faire échouer
// la mutation déjà enregistrée en base.

type PathTarget = string | { path: string; type: "page" | "layout" };

function revalidate(targets: PathTarget[]) {
  const seen = new Set<string>();
  for (const target of targets) {
    const path = typeof target === "string" ? target : target.path;
    const type = typeof target === "string" ? undefined : target.type;
    const id = `${path}|${type ?? ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      if (type) revalidatePath(path, type);
      else revalidatePath(path);
    } catch (error) {
      console.error(`[revalidate] invalidation de ${path} impossible :`, error);
    }
  }
}

const cleanSlugs = (slugs: (string | null | undefined)[]) =>
  [...new Set(slugs.filter((slug): slug is string => typeof slug === "string" && slug.length > 0))];

// Produits : accueil, boutique, accessoires, recherche, fiches produit (y
// compris l'ancien slug en cas de renommage), sitemap, pages admin.
export function revalidateCatalog(options: { slugs?: (string | null | undefined)[]; productId?: string } = {}) {
  const slugs = cleanSlugs(options.slugs ?? []);
  revalidate([
    "/",
    "/boutique",
    "/accessoires",
    "/recherche",
    ...slugs.map((slug) => `/produit/${slug}`),
    { path: "/produit/[slug]", type: "page" },
    "/sitemap.xml",
    "/admin",
    "/admin/produits",
    ...(options.productId ? [`/admin/produits/${options.productId}`] : []),
  ]);
}

// Commandes : la création / l'annulation modifient le stock affiché sur le
// site ; les changements de statut n'affectent que l'admin.
export function revalidateOrders(options: { orderId?: string; slugs?: (string | null | undefined)[]; stockChanged?: boolean } = {}) {
  revalidate([
    "/admin",
    "/admin/commandes",
    ...(options.orderId ? [`/admin/commandes/${options.orderId}`] : []),
  ]);
  if (options.stockChanged) revalidateCatalog({ slugs: options.slugs });
}

// Journal : accueil (derniers articles), liste, article (+ ancien slug), sitemap.
export function revalidateJournal(options: { slugs?: (string | null | undefined)[]; articleId?: string } = {}) {
  const slugs = cleanSlugs(options.slugs ?? []);
  revalidate([
    "/",
    "/journal",
    ...slugs.map((slug) => `/journal/${slug}`),
    { path: "/journal/[slug]", type: "page" },
    "/sitemap.xml",
    "/admin/articles",
    ...(options.articleId ? [`/admin/articles/${options.articleId}`] : []),
  ]);
}

// Images du site (/admin/apparence) : elles peuvent apparaître dans les
// layouts, on invalide donc tout l'arbre public.
export function revalidateSiteSettings() {
  revalidate([{ path: "/", type: "layout" }, "/", "/admin/apparence"]);
}

export function revalidateAmbassadors() {
  revalidate(["/ambassadrices", "/", "/admin/ambassadrices"]);
}

export function revalidateStores() {
  revalidate(["/boutiques", "/", "/admin/boutiques"]);
}

export function revalidateApplications() {
  revalidate(["/admin", "/admin/candidatures", "/admin/ambassadrices"]);
}

export function revalidateNewsletter() {
  revalidate(["/admin", "/admin/newsletter"]);
}

// Médias : la bibliothèque admin. Une suppression forcée peut casser des
// visuels publics → on invalide aussi l'ensemble du site.
export function revalidateMedia(options: { deletedInUse?: boolean } = {}) {
  revalidate(["/admin/medias", ...(options.deletedInUse ? [{ path: "/", type: "layout" as const }] : [])]);
}
