import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { QA_PREFIX } from "./env";

// Fabriques de données de test. Chaque entité reçoit un identifiant unique
// (préfixe `qa-` + horodatage + aléa) : aucun test ne suppose une base vierge.

let counter = 0;

/** Identifiant unique, compatible avec les slugs (`[a-z0-9-]`). */
export function uniqueId(label = "t") {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 7);
  return `${QA_PREFIX}-${label}-${Date.now().toString(36)}-${counter}${random}`.toLowerCase();
}

export function uniqueEmail(label = "client") {
  return `${uniqueId(label)}@example.com`;
}

/** Lit le JSON d'une réponse en affichant le corps si le statut n'est pas celui attendu. */
export async function expectStatus(response: APIResponse, status: number | number[], context = "") {
  const expected = Array.isArray(status) ? status : [status];
  if (!expected.includes(response.status())) {
    const body = await response.text().catch(() => "<corps illisible>");
    expect(expected, `${context} ${response.request().method()} ${response.url()} → ${response.status()} : ${body.slice(0, 500)}`).toContain(response.status());
  }
}

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

export type VariantInput = { sku: string; volume: string; price: number; stock: number; isActive: boolean };

export type ProductInput = {
  name: string;
  slug: string;
  category: "PARFUM" | "ACCESSOIRE";
  description: string;
  story: string;
  images: string[];
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  isActive: boolean;
  variants: VariantInput[];
};

export type AdminProduct = ProductInput & { id: string; variants: (VariantInput & { id: string })[] };

export function productPayload(
  overrides: Partial<Omit<ProductInput, "variants">> & { variants?: Partial<VariantInput>[] } = {},
): ProductInput {
  const slug = overrides.slug ?? uniqueId("produit");
  const skuBase = slug.replace(/[^a-z0-9]/g, "").slice(-18).toUpperCase();
  const variants = (overrides.variants ?? [{}]).map((variant, index) => ({
    sku: `QA-${skuBase}-${index + 1}`,
    volume: `${(index + 1) * 30} ml`,
    price: 2500,
    stock: 20,
    isActive: true,
    ...variant,
  }));
  return {
    // Nom court (pas de débordement sur mobile) mais unique : suffixe aléatoire du slug.
    name: `Parfum QA ${slug.slice(-8)}`,
    category: "PARFUM",
    description: "Produit créé automatiquement par la suite de tests QA.",
    story: "Histoire de test : ce produit est supprimé ou désactivé à la fin du test.",
    images: ["/craft.jpg"],
    notesTop: ["Bergamote"],
    notesHeart: ["Rose"],
    notesBase: ["Musc"],
    isActive: true,
    ...overrides,
    slug,
    variants,
  };
}

export async function createProduct(admin: APIRequestContext, input: ProductInput): Promise<AdminProduct> {
  const response = await admin.post("/api/admin/products", { data: input });
  await expectStatus(response, 201, "création produit");
  return ((await response.json()) as { product: AdminProduct }).product;
}

export async function getProduct(admin: APIRequestContext, id: string): Promise<AdminProduct> {
  const response = await admin.get(`/api/admin/products/${id}`);
  await expectStatus(response, 200, "lecture produit");
  return ((await response.json()) as { product: AdminProduct }).product;
}

export async function variantStock(admin: APIRequestContext, productId: string, volume: string) {
  const product = await getProduct(admin, productId);
  const variant = product.variants.find((candidate) => candidate.volume === volume);
  expect(variant, `variante ${volume} introuvable`).toBeTruthy();
  return variant!.stock;
}

/**
 * Nettoyage : suppression, ou désactivation si le produit est lié à une commande
 * (l'API refuse alors la suppression avec 409, ce qui est le comportement voulu).
 */
export async function removeProduct(admin: APIRequestContext, id: string) {
  const deleted = await admin.delete(`/api/admin/products/${id}`);
  if (deleted.status() === 204 || deleted.status() === 404) return;
  await admin.patch(`/api/admin/products/${id}`, { data: { isActive: false } });
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

export type OrderLine = { slug: string; volume: string; quantity: number; price?: number; name?: string };

export function orderPayload(lines: OrderLine[], email = uniqueEmail("commande")) {
  return {
    email,
    items: lines.map((line) => ({
      slug: line.slug,
      name: line.name ?? "Nom fourni par le client",
      image: "/craft.jpg",
      volume: line.volume,
      // Prix « client » : le serveur doit l'ignorer et utiliser celui de la base.
      price: line.price ?? 1,
      quantity: line.quantity,
    })),
    deliveryAddress: {
      firstName: "Camille",
      lastName: "Testeuse",
      address: "1 rue de la Qualité",
      city: "Paris",
      postalCode: "75001",
      country: "France",
      phone: "0600000000",
    },
  };
}

export type CreatedOrder = {
  id: string;
  email: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  items: { name: string; volume: string; quantity: number; price: number; productId: string }[];
};

// ---------------------------------------------------------------------------
// Articles, ambassadrices, boutiques
// ---------------------------------------------------------------------------

export function articlePayload(overrides: Partial<{ title: string; slug: string; excerpt: string; content: string; coverImage: string; isPublished: boolean }> = {}) {
  const slug = overrides.slug ?? uniqueId("article");
  return {
    title: `Article QA ${slug.slice(-10)}`,
    excerpt: "Extrait d'un article créé par la suite de tests.",
    content: "Premier paragraphe de l'article de test.\n\nSecond paragraphe.",
    coverImage: "/essence.jpg",
    isPublished: true,
    ...overrides,
    slug,
  };
}

export function ambassadorPayload(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  return {
    name: `Ambassadrice ${uniqueId("amb").slice(-12)}`,
    role: "Testeuse",
    photo: "/essence.jpg",
    description: "Ambassadrice créée automatiquement par la suite de tests QA.",
    instagram: "",
    isActive: true,
    sortOrder: 9000,
    ...overrides,
  };
}

export function storePayload(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  return {
    name: `Boutique ${uniqueId("store").slice(-12)}`,
    address: "10 rue des Tests",
    city: "75002 Paris",
    country: "France",
    phone: "",
    openingHours: "Lun–Sam · 10h–19h",
    image: "/bestseller.jpg",
    isActive: true,
    sortOrder: 9000,
    ...overrides,
  };
}

export function applicationPayload(overrides: Partial<{ email: string; message: string; website: string; firstName: string }> = {}) {
  return {
    firstName: "Léa",
    lastName: "Candidate",
    email: uniqueEmail("candidature"),
    phone: "0600000000",
    instagram: "@lea.qa",
    city: "Lyon",
    message: "Je souhaite devenir ambassadrice JAE Paris : je partage déjà mes parfums préférés chaque semaine.",
    ...overrides,
  };
}

/** Formate un montant en centimes comme le site (fr-FR), tolérant aux espaces insécables. */
export function priceRegExp(cents: number) {
  // Séparateur de milliers fr-FR (espace fine insécable) rendu optionnel.
  const euros = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, "\\s?");
  const centsPart = cents % 100;
  const amount = centsPart === 0 ? `${euros}(?:,00)?` : `${euros},${String(centsPart).padStart(2, "0")}`;
  return new RegExp(`${amount}\\s*€`);
}
