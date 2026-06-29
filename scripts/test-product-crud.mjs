const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis.");

function createCookieJar() {
  const cookies = new Map();
  return {
    absorb(response) {
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(";", 1);
        const separator = pair.indexOf("=");
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    },
    header() { return [...cookies].map(([name, value]) => `${name}=${value}`).join("; "); },
  };
}

async function authenticatedJar() {
  const jar = createCookieJar();
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  jar.absorb(csrfResponse);
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { cookie: jar.header(), "content-type": "application/x-www-form-urlencoded", "x-auth-return-redirect": "1" },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${baseUrl}/admin/produits` }),
  });
  jar.absorb(response);
  const result = await response.json();
  if (!response.ok || result.url?.includes("error=")) throw new Error("Connexion impossible pour le test CRUD.");
  return jar;
}

async function api(path, options, jar) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options?.body ? { "content-type": "application/json" } : {}), ...(jar ? { cookie: jar.header() } : {}) },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, data };
}

const unauthorized = await api("/api/admin/products", {}, null);
if (unauthorized.response.status !== 401) throw new Error("L’API produits accepte une requête non authentifiée.");
console.info("✓ API produits refusée sans session");

const jar = await authenticatedJar();
const slug = `test-crud-${Date.now()}`;
const original = {
  name: "Parfum Test CRUD",
  slug,
  description: "Une description suffisamment longue pour le test automatisé.",
  story: "Une histoire suffisamment longue pour vérifier la création du produit.",
  images: ["/parfum-or.svg"],
  notesTop: ["Néroli"], notesHeart: ["Jasmin"], notesBase: ["Santal"],
  isActive: true,
  variants: [{ sku: `TEST-${Date.now()}`, volume: "50 ml", price: 12900, stock: 8, isActive: true }],
};

let productId;
try {
  const created = await api("/api/admin/products", { method: "POST", body: JSON.stringify(original) }, jar);
  if (created.response.status !== 201 || !created.data?.product?.id) throw new Error(`Création échouée (${created.response.status}).`);
  productId = created.data.product.id;
  console.info("✓ Création produit validée");

  const updatedPayload = { ...original, name: "Parfum Test Modifié", isActive: false, variants: [{ ...original.variants[0], price: 13900, stock: 4 }] };
  const updated = await api(`/api/admin/products/${productId}`, { method: "PUT", body: JSON.stringify(updatedPayload) }, jar);
  if (!updated.response.ok || updated.data.product.name !== "Parfum Test Modifié" || updated.data.product.variants[0].price !== 13900) throw new Error("Modification échouée.");
  console.info("✓ Modification et variantes validées");

  const published = await api(`/api/admin/products/${productId}`, { method: "PATCH", body: JSON.stringify({ isActive: true }) }, jar);
  if (!published.response.ok || published.data.product.isActive !== true) throw new Error("Publication échouée.");
  console.info("✓ Publication produit validée");

  const listed = await api("/api/admin/products", {}, jar);
  if (!listed.response.ok || !listed.data.products.some((product) => product.id === productId)) throw new Error("Produit absent de la liste admin.");
  console.info("✓ Lecture et liste produits validées");

  const adminPage = await fetch(`${baseUrl}/admin/produits`, { headers: { cookie: jar.header() } });
  const adminHtml = await adminPage.text();
  if (!adminPage.ok || !adminHtml.includes("Parfum Test Modifié")) throw new Error("La page de gestion ne reflète pas le produit modifié.");
  console.info("✓ Écran admin produits connecté à PostgreSQL");

  const shopPage = await fetch(`${baseUrl}/boutique`);
  const shopHtml = await shopPage.text();
  if (!shopPage.ok || !shopHtml.includes("Parfum Test Modifié")) throw new Error("La boutique publique ne reflète pas le produit publié.");
  console.info("✓ Catalogue public synchronisé avec le CRUD");

  const deleted = await api(`/api/admin/products/${productId}`, { method: "DELETE" }, jar);
  if (deleted.response.status !== 204) throw new Error("Suppression échouée.");
  productId = undefined;
  console.info("✓ Suppression produit validée");
} finally {
  if (productId) await api(`/api/admin/products/${productId}`, { method: "DELETE" }, jar);
}
