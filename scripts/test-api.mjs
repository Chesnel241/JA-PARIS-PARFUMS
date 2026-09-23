// Tests d'intégration de l'API JAE Paris (Node pur, fetch).
//
//   node --env-file=.env scripts/test-api.mjs          (ou : npm run test:api)
//   BASE_URL=https://preview.example.com node --env-file=.env scripts/test-api.mjs
//
// Pré-requis : serveur démarré (next dev), base migrée et seedée, ADMIN_EMAIL /
// ADMIN_PASSWORD d'un compte ADMIN. Le script crée ses propres données de test
// (préfixe « zz-test-api ») et les nettoie / désactive à la fin.
//
// Chaque requête porte une adresse IP fictive aléatoire (X-Forwarded-For) pour
// ne pas épuiser les quotas du limiteur de débit entre deux exécutions ; les
// tests du limiteur utilisent une IP fixe propre à l'exécution.

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis (node --env-file=.env …).");
  process.exit(1);
}

const RUN = Date.now().toString(36);
let passed = 0;
const failures = [];

function randomIp() {
  const byte = () => Math.floor(Math.random() * 254) + 1;
  return `10.${byte()}.${byte()}.${byte()}`;
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.info(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`  ✗ ${name}\n      ${error instanceof Error ? error.message : error}`);
  }
}

function section(title) {
  console.info(`\n${title}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(result, expected, context = "") {
  const list = Array.isArray(expected) ? expected : [expected];
  if (!list.includes(result.status)) {
    throw new Error(`${context} statut ${result.status} (attendu ${list.join("/")}) — ${JSON.stringify(result.data)?.slice(0, 300)}`);
  }
}

// Page introuvable : vrai 404, ou « soft 404 » de Next.js (200 + noindex +
// marqueur NEXT_HTTP_ERROR_FALLBACK;404) quand la page est rendue en streaming
// sous un loading.tsx. Voir docs/API.md (points de vigilance).
function assertPageNotFound(result, context) {
  const softNotFound = result.status === 200 && String(result.text).includes("NEXT_HTTP_ERROR_FALLBACK;404");
  if (result.status !== 404 && !softNotFound) throw new Error(`${context} : page encore servie (statut ${result.status})`);
}

function createCookieJar() {
  const cookies = new Map();
  return {
    absorb(response) {
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(";", 1);
        const separator = pair.indexOf("=");
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (!value || /max-age=0/i.test(header) || /expires=thu, 01 jan 1970/i.test(header)) cookies.delete(name);
        else cookies.set(name, value);
      }
    },
    header() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    has(name) {
      return cookies.has(name);
    },
  };
}

async function request(path, { method = "GET", body, jar, ip = randomIp(), headers = {}, raw = false } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      "x-forwarded-for": ip,
      ...(body !== undefined && !isForm ? { "content-type": "application/json" } : {}),
      ...(jar ? { cookie: jar.header() } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm || typeof body === "string" ? body : JSON.stringify(body),
  });
  if (raw) return { status: response.status, response, data: null };
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, response, data, text };
}

async function login(password = PASSWORD, ip = randomIp()) {
  const jar = createCookieJar();
  const csrf = await fetch(`${BASE_URL}/api/auth/csrf`, { headers: { "x-forwarded-for": ip } });
  jar.absorb(csrf);
  const { csrfToken } = await csrf.json();
  const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: jar.header(),
      "content-type": "application/x-www-form-urlencoded",
      "x-auth-return-redirect": "1",
      "x-forwarded-for": ip,
    },
    body: new URLSearchParams({ email: EMAIL, password, csrfToken, callbackUrl: `${BASE_URL}/admin` }),
  });
  jar.absorb(response);
  const data = await response.json().catch(() => ({}));
  return { jar, ok: response.ok && !String(data.url ?? "").includes("error="), data };
}

// PNG 1×1 valide.
const PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0f01f0005000201e2213fbc0000000049454e44ae426082",
  "hex",
);

function uploadForm(bytes, filename, type) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), filename);
  return form;
}

const FAKE_ID = "cabcdefghijklmnopqrstuvwx";

const ADMIN_ROUTES = [
  ["GET", "/api/admin/products"], ["POST", "/api/admin/products"],
  ["GET", `/api/admin/products/${FAKE_ID}`], ["PUT", `/api/admin/products/${FAKE_ID}`], ["PATCH", `/api/admin/products/${FAKE_ID}`], ["DELETE", `/api/admin/products/${FAKE_ID}`],
  ["GET", "/api/admin/articles"], ["POST", "/api/admin/articles"],
  ["GET", `/api/admin/articles/${FAKE_ID}`], ["PUT", `/api/admin/articles/${FAKE_ID}`], ["PATCH", `/api/admin/articles/${FAKE_ID}`], ["DELETE", `/api/admin/articles/${FAKE_ID}`],
  ["GET", "/api/admin/ambassadors"], ["POST", "/api/admin/ambassadors"],
  ["GET", `/api/admin/ambassadors/${FAKE_ID}`], ["PUT", `/api/admin/ambassadors/${FAKE_ID}`], ["PATCH", `/api/admin/ambassadors/${FAKE_ID}`], ["DELETE", `/api/admin/ambassadors/${FAKE_ID}`],
  ["GET", "/api/admin/stores"], ["POST", "/api/admin/stores"],
  ["GET", `/api/admin/stores/${FAKE_ID}`], ["PUT", `/api/admin/stores/${FAKE_ID}`], ["PATCH", `/api/admin/stores/${FAKE_ID}`], ["DELETE", `/api/admin/stores/${FAKE_ID}`],
  ["GET", "/api/admin/applications"], ["GET", "/api/admin/applications?format=csv"],
  ["PATCH", `/api/admin/applications/${FAKE_ID}`], ["DELETE", `/api/admin/applications/${FAKE_ID}`],
  ["GET", "/api/admin/newsletter"], ["GET", "/api/admin/newsletter?format=csv"], ["DELETE", `/api/admin/newsletter/${FAKE_ID}`],
  ["GET", "/api/admin/orders"], ["GET", `/api/admin/orders/${FAKE_ID}`], ["PATCH", `/api/admin/orders/${FAKE_ID}`],
  ["GET", "/api/admin/media"], ["POST", "/api/admin/media"],
  ["GET", `/api/admin/media/${FAKE_ID}`], ["DELETE", `/api/admin/media/${FAKE_ID}`],
  ["GET", "/api/admin/settings"], ["PUT", "/api/admin/settings"],
];

const address = {
  firstName: "Camille",
  lastName: "Test",
  address: "12 rue de la Paix",
  postalCode: "75002",
  city: "Paris",
  country: "France",
  phone: "+33 6 12 34 56 78",
};

function productPayload(slug, overrides = {}) {
  return {
    name: `Test API ${slug}`,
    slug,
    category: "PARFUM",
    description: "Produit créé automatiquement par scripts/test-api.mjs.",
    story: "Histoire suffisamment longue pour passer la validation du produit.",
    images: ["/parfum-or.svg"],
    notesTop: ["Bergamote"], notesHeart: ["Rose"], notesBase: ["Musc"],
    isActive: true,
    variants: [{ sku: `ZZ-${slug.toUpperCase()}`.slice(0, 60), volume: "50 ml", price: 2500, stock: 50, isActive: true }],
    ...overrides,
  };
}

function orderPayload(items, overrides = {}) {
  return { email: "Client.Test@Example.com", items, deliveryAddress: address, ...overrides };
}

async function main() {
  console.info(`API JAE Paris — ${BASE_URL}`);

  section("Santé & surface publique");
  await test("GET /api/health → ok, db ok, no-store, aucun secret", async () => {
    const result = await request("/api/health");
    assertStatus(result, 200);
    assert(result.data.status === "ok" && result.data.db === "ok" && typeof result.data.time === "string", `réponse inattendue ${JSON.stringify(result.data)}`);
    assert(/no-store/.test(result.response.headers.get("cache-control") ?? ""), "Cache-Control no-store manquant");
    assert(!/postgres|secret|password/i.test(result.text), "la réponse contient une information sensible");
  });
  await test("GET /robots.txt → disallow admin/api, sitemap absolu", async () => {
    const result = await request("/robots.txt");
    assertStatus(result, 200);
    for (const rule of ["Disallow: /admin", "Disallow: /api/", "Disallow: /connexion-admin", "Disallow: /panier", "Disallow: /compte"]) {
      assert(result.text.includes(rule), `règle absente : ${rule}`);
    }
    assert(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/.test(result.text), "Sitemap absolu absent");
  });
  await test("GET /sitemap.xml → XML avec produits et articles", async () => {
    const result = await request("/sitemap.xml");
    assertStatus(result, 200);
    assert(result.text.includes("<urlset") && result.text.includes("/produit/") && result.text.includes("/journal/"), "sitemap incomplet");
    assert(result.text.includes("<lastmod>"), "lastmod absent");
  });
  await test("GET /api/articles → liste publique", async () => {
    const result = await request("/api/articles");
    assertStatus(result, 200);
    assert(Array.isArray(result.data.articles), "articles absent");
  });
  await test("En-têtes de sécurité (CSP, nosniff, frame-ancestors)", async () => {
    const result = await request("/api/health");
    const csp = result.response.headers.get("content-security-policy") ?? "";
    for (const directive of ["frame-ancestors 'none'", "form-action 'self'", "base-uri 'self'", "object-src 'none'", "img-src 'self' data: blob: https:"]) {
      assert(csp.includes(directive), `CSP sans ${directive}`);
    }
    assert(result.response.headers.get("x-content-type-options") === "nosniff", "nosniff absent");
  });

  section("Contrôle d'accès (sans session)");
  await test(`401 sur les ${ADMIN_ROUTES.length} couples méthode/route admin sans cookie`, async () => {
    const wrong = [];
    for (const [method, path] of ADMIN_ROUTES) {
      const result = await request(path, { method, body: ["POST", "PUT", "PATCH"].includes(method) && !path.endsWith("/media") ? {} : undefined });
      if (result.status !== 401 || typeof result.data?.error !== "string") wrong.push(`${method} ${path} → ${result.status}`);
    }
    assert(wrong.length === 0, wrong.join(", "));
  });
  await test("401 avec un cookie de session forgé (vérification côté route)", async () => {
    const wrong = [];
    for (const [method, path] of ADMIN_ROUTES) {
      const result = await request(path, { method, headers: { cookie: "authjs.session-token=forge.invalide" }, body: ["POST", "PUT", "PATCH"].includes(method) && !path.endsWith("/media") ? {} : undefined });
      if (result.status !== 401) wrong.push(`${method} ${path} → ${result.status}`);
    }
    assert(wrong.length === 0, wrong.join(", "));
  });
  await test("/admin sans session → redirection connexion avec callbackUrl", async () => {
    const result = await request("/admin/commandes?filtre=paid", { raw: true });
    assertStatus(result, [302, 307]);
    const location = result.response.headers.get("location") ?? "";
    assert(location.includes("/connexion-admin") && decodeURIComponent(location).includes("callbackUrl=/admin/commandes?filtre=paid"), `redirection ${location}`);
  });
  await test("/admin avec cookie forgé → connexion avec callbackUrl du chemin courant", async () => {
    const result = await request("/admin/produits", { raw: true, headers: { cookie: "authjs.session-token=forge.invalide" } });
    assertStatus(result, [302, 303, 307]);
    const location = decodeURIComponent(result.response.headers.get("location") ?? "");
    assert(location.includes("/connexion-admin?callbackUrl=/admin/produits"), `redirection ${location}`);
  });
  await test("Mauvais mot de passe refusé", async () => {
    const result = await login("mot-de-passe-volontairement-faux");
    assert(!result.ok, "connexion acceptée avec un mauvais mot de passe");
  });

  section("Connexion administrateur");
  const session = await login();
  await test("Connexion via le flux credentials Auth.js", async () => {
    assert(session.ok, `connexion refusée : ${JSON.stringify(session.data)}`);
    assert(session.jar.has("authjs.session-token") || session.jar.has("__Secure-authjs.session-token"), "cookie de session absent");
  });
  const jar = session.jar;
  await test("Session Auth.js : rôle ADMIN", async () => {
    const result = await request("/api/auth/session", { jar });
    assert(result.data?.user?.role === "ADMIN" && result.data.user.email === EMAIL.toLowerCase(), `session ${JSON.stringify(result.data)}`);
  });
  await test("Back-office /admin accessible avec la session", async () => {
    const result = await request("/admin", { jar });
    assertStatus(result, 200);
  });
  await test("Requête admin modifiante d'une autre origine → 403", async () => {
    const result = await request("/api/admin/products", { method: "POST", jar, body: {}, headers: { origin: "https://site-malveillant.example" } });
    assertStatus(result, 403);
  });

  section("Validation & erreurs uniformes");
  await test("JSON invalide → 422 { error }", async () => {
    const result = await request("/api/admin/products", { method: "POST", jar, body: "{pas du json" });
    assertStatus(result, 422);
    assert(typeof result.data.error === "string", "error absent");
  });
  await test("Corps invalide → 422 { error, fields }", async () => {
    const result = await request("/api/admin/articles", { method: "POST", jar, body: { title: "x" } });
    assertStatus(result, 422);
    assert(result.data.fields?.fieldErrors?.slug, "fields.fieldErrors absent");
  });
  await test("Identifiant malformé → 404 propre (pas d'exception Prisma)", async () => {
    for (const path of ["/api/admin/products/%27%3B--", "/api/admin/orders/..%2F..", `/api/admin/articles/${"x".repeat(200)}`, "/api/media/%00"]) {
      const result = await request(path, { jar });
      assertStatus(result, 404, path);
      assert(typeof result.data?.error === "string" && !/prisma|invocation/i.test(result.text), `${path} : fuite ${result.text}`);
    }
  });
  await test("Identifiant inconnu → 404 sur GET/PUT/PATCH/DELETE", async () => {
    const checks = [
      ["GET", `/api/admin/products/${FAKE_ID}`],
      ["PATCH", `/api/admin/products/${FAKE_ID}`, { isActive: true }],
      ["DELETE", `/api/admin/articles/${FAKE_ID}`],
      ["PATCH", `/api/admin/stores/${FAKE_ID}`, { isActive: false }],
      ["DELETE", `/api/admin/ambassadors/${FAKE_ID}`],
      ["PATCH", `/api/admin/applications/${FAKE_ID}`, { status: "CONTACTED" }],
      ["DELETE", `/api/admin/newsletter/${FAKE_ID}`],
      ["PATCH", `/api/admin/orders/${FAKE_ID}`, { action: "cancel" }],
      ["DELETE", `/api/admin/media/${FAKE_ID}`],
    ];
    for (const [method, path, body] of checks) {
      const result = await request(path, { method, jar, body });
      assertStatus(result, 404, `${method} ${path}`);
    }
  });
  await test("Paramètre de requête invalide → 422", async () => {
    const result = await request("/api/admin/orders?status=NIMPORTE", { jar });
    assertStatus(result, 422);
  });

  section("Produits (CRUD + synchro site public)");
  const slugA = `zz-test-api-a-${RUN}`;
  let productA;
  await test("POST produit → 201", async () => {
    const result = await request("/api/admin/products", { method: "POST", jar, body: productPayload(slugA) });
    assertStatus(result, 201);
    productA = result.data.product;
    assert(productA.id && productA.variants.length === 1, "produit incomplet");
  });
  await test("Slug déjà utilisé → 409", async () => {
    const result = await request("/api/admin/products", { method: "POST", jar, body: productPayload(slugA, { variants: [{ sku: `ZZ-OTHER-${RUN}`.toUpperCase(), volume: "50 ml", price: 100, stock: 1, isActive: true }] }) });
    assertStatus(result, 409);
  });
  await test("Produit visible sur /boutique et /produit/[slug]", async () => {
    const shop = await request("/boutique");
    assert(shop.text.includes(`Test API ${slugA}`), "absent de /boutique");
    const page = await request(`/produit/${slugA}`);
    assertStatus(page, 200);
  });
  const slugA2 = `${slugA}-renomme`;
  await test("PUT produit (renommage du slug) → 200, ancienne URL 404, nouvelle 200", async () => {
    const result = await request(`/api/admin/products/${productA.id}`, { method: "PUT", jar, body: productPayload(slugA2, { name: `Test API ${slugA2}`, variants: [{ ...productPayload(slugA).variants[0], price: 2600 }] }) });
    assertStatus(result, 200);
    assert(result.data.product.slug === slugA2 && result.data.product.variants[0].price === 2600, "modification non appliquée");
    assertPageNotFound(await request(`/produit/${slugA}`), "ancienne URL");
    const newPage = await request(`/produit/${slugA2}`);
    assertStatus(newPage, 200, "nouvelle URL");
  });
  await test("PATCH dépublication → retiré de /boutique", async () => {
    const result = await request(`/api/admin/products/${productA.id}`, { method: "PATCH", jar, body: { isActive: false } });
    assertStatus(result, 200);
    const shop = await request("/boutique");
    assert(!shop.text.includes(`Test API ${slugA2}`), "toujours présent sur /boutique");
  });
  await test("GET liste + détail produit", async () => {
    const list = await request("/api/admin/products", { jar });
    assert(list.data.products.some((product) => product.id === productA.id), "absent de la liste");
    const detail = await request(`/api/admin/products/${productA.id}`, { jar });
    assertStatus(detail, 200);
  });
  await test("DELETE produit → 204 puis 404", async () => {
    const result = await request(`/api/admin/products/${productA.id}`, { method: "DELETE", jar });
    assertStatus(result, 204);
    const again = await request(`/api/admin/products/${productA.id}`, { jar });
    assertStatus(again, 404);
  });

  section("Articles (CRUD + synchro Journal)");
  const articleSlug = `zz-test-api-article-${RUN}`;
  let article;
  await test("POST article publié → 201 et visible sur /journal", async () => {
    const result = await request("/api/admin/articles", { method: "POST", jar, body: { title: `Article test ${RUN}`, slug: articleSlug, excerpt: "Un extrait suffisamment long.", content: "Un contenu suffisamment long pour le test.", coverImage: "/craft.jpg", isPublished: true } });
    assertStatus(result, 201);
    article = result.data.article;
    const journal = await request("/journal");
    assert(journal.text.includes(`Article test ${RUN}`), "absent de /journal");
  });
  await test("PUT / PATCH / DELETE article", async () => {
    const updated = await request(`/api/admin/articles/${article.id}`, { method: "PUT", jar, body: { title: `Article modifié ${RUN}`, slug: articleSlug, excerpt: "Un extrait suffisamment long.", content: "Un contenu suffisamment long pour le test.", coverImage: "/craft.jpg", isPublished: true } });
    assertStatus(updated, 200);
    assert(updated.data.article.publishedAt === article.publishedAt, "date de publication modifiée");
    const unpublished = await request(`/api/admin/articles/${article.id}`, { method: "PATCH", jar, body: { isPublished: false } });
    assertStatus(unpublished, 200);
    assertPageNotFound(await request(`/journal/${articleSlug}`), "article dépublié");
    const deleted = await request(`/api/admin/articles/${article.id}`, { method: "DELETE", jar });
    assertStatus(deleted, 204);
  });

  section("Ambassadrices & boutiques (CRUD)");
  await test("Ambassadrice : POST / GET / PUT / PATCH / DELETE", async () => {
    const payload = { name: `Test ${RUN}`, role: "Testeuse", photo: "/essence.jpg", description: "Une description suffisamment longue.", instagram: "", isActive: true, sortOrder: 99 };
    const created = await request("/api/admin/ambassadors", { method: "POST", jar, body: payload });
    assertStatus(created, 201);
    const id = created.data.ambassador.id;
    assertStatus(await request(`/api/admin/ambassadors/${id}`, { jar }), 200);
    const updated = await request(`/api/admin/ambassadors/${id}`, { method: "PUT", jar, body: { ...payload, role: "Modifiée" } });
    assert(updated.data.ambassador.role === "Modifiée", "PUT non appliqué");
    assertStatus(await request(`/api/admin/ambassadors/${id}`, { method: "PATCH", jar, body: { isActive: false } }), 200);
    assertStatus(await request(`/api/admin/ambassadors/${id}`, { method: "DELETE", jar }), 204);
    assertStatus(await request(`/api/admin/ambassadors/${id}`, { jar }), 404);
  });
  await test("Ambassadrice : photo javascript: refusée (422)", async () => {
    const result = await request("/api/admin/ambassadors", { method: "POST", jar, body: { name: "XSS", role: "", photo: "javascript:alert(1)", description: "Une description suffisamment longue.", isActive: true, sortOrder: 0 } });
    assertStatus(result, 422);
  });
  await test("Boutique : POST / GET / PUT / PATCH / DELETE", async () => {
    const payload = { name: `Boutique test ${RUN}`, address: "1 rue du Test", city: "Paris", country: "France", phone: "", openingHours: "Lun–Sam · 10h–19h", image: "/bestseller.jpg", isActive: true, sortOrder: 99 };
    const created = await request("/api/admin/stores", { method: "POST", jar, body: payload });
    assertStatus(created, 201);
    const id = created.data.store.id;
    assertStatus(await request(`/api/admin/stores/${id}`, { jar }), 200);
    assertStatus(await request(`/api/admin/stores/${id}`, { method: "PUT", jar, body: { ...payload, city: "Lyon" } }), 200);
    assertStatus(await request(`/api/admin/stores/${id}`, { method: "PATCH", jar, body: { isActive: false } }), 200);
    assertStatus(await request(`/api/admin/stores/${id}`, { method: "DELETE", jar }), 204);
  });
  await test("Réglages : GET + PUT emplacement inconnu refusé + PUT/réinitialisation", async () => {
    const current = await request("/api/admin/settings", { jar });
    assertStatus(current, 200);
    assert(current.data.images["home.hero.card"], "images absentes");
    assertStatus(await request("/api/admin/settings", { method: "PUT", jar, body: { key: "inconnu", value: "/x.jpg" } }), 422);
    const set = await request("/api/admin/settings", { method: "PUT", jar, body: { key: "home.hero.card", value: "/essence.jpg" } });
    assert(set.data.images["home.hero.card"] === "/essence.jpg", "réglage non appliqué");
    const reset = await request("/api/admin/settings", { method: "PUT", jar, body: { key: "home.hero.card", value: "" } });
    const defaultCard = current.data.slots?.find?.((slot) => slot.key === "home.hero.card")?.defaultValue ?? "/hero.jpg";
    assert(reset.data.images["home.hero.card"] === defaultCard, "réinitialisation non appliquée");
  });

  section("Commandes");
  // Produits de test dédiés (stock maîtrisé), réutilisés d'une exécution à l'autre.
  const products = {};
  for (const [key, price, stock] of [["b", 2500, 100], ["c", 4000, 1], ["d", 1000, 5]]) {
    const slug = `zz-test-api-${key}`;
    const list = await request("/api/admin/products", { jar });
    const existing = list.data.products.find((product) => product.slug === slug);
    const payload = productPayload(slug, { variants: [{ sku: `ZZ-TEST-API-${key.toUpperCase()}`, volume: "50 ml", price, stock, isActive: true }] });
    const result = existing
      ? await request(`/api/admin/products/${existing.id}`, { method: "PUT", jar, body: payload })
      : await request("/api/admin/products", { method: "POST", jar, body: payload });
    if (![200, 201].includes(result.status)) throw new Error(`préparation produit ${slug} impossible : ${result.status} ${JSON.stringify(result.data)}`);
    products[key] = result.data.product;
  }
  const line = (key, quantity, extra = {}) => ({ slug: products[key].slug, volume: "50 ml", quantity, name: "x", image: "/x.jpg", price: 1, ...extra });
  const stockOf = async (key) => (await request(`/api/admin/products/${products[key].id}`, { jar })).data.product.variants[0].stock;

  let orderBelow;
  await test("Commande sous 50 € : prix client ignoré, livraison 5,90 €", async () => {
    const result = await request("/api/orders", { method: "POST", body: orderPayload([line("b", 1)]) });
    assertStatus(result, 201);
    orderBelow = result.data.order;
    assert(orderBelow.items[0].price === 2500, `prix non relu en base (${orderBelow.items[0].price})`);
    assert(orderBelow.subtotal === 2500 && orderBelow.shippingAmount === 590 && orderBelow.totalAmount === 3090, `montants ${orderBelow.subtotal}/${orderBelow.shippingAmount}/${orderBelow.totalAmount}`);
    assert(/^JAE-[2-9A-HJ-NP-Z]{6}$/.test(orderBelow.reference), `référence ${orderBelow.reference}`);
    assert(orderBelow.id && orderBelow.email === "client.test@example.com", "id/email");
    assert(result.data.payment?.url?.startsWith("https://pay.lydia.me/") && result.data.payment.reference === orderBelow.reference, "instructions de paiement absentes");
  });
  await test("Commande à exactement 50 € : livraison offerte", async () => {
    const result = await request("/api/orders", { method: "POST", body: orderPayload([line("b", 2)]) });
    assertStatus(result, 201);
    assert(result.data.order.subtotal === 5000 && result.data.order.shippingAmount === 0 && result.data.order.totalAmount === 5000, "seuil 50 € incorrect");
  });
  await test("Lignes dupliquées fusionnées", async () => {
    const result = await request("/api/orders", { method: "POST", body: orderPayload([line("b", 1), line("b", 2)]) });
    assertStatus(result, 201);
    assert(result.data.order.items.length === 1 && result.data.order.items[0].quantity === 3, "lignes non fusionnées");
    assert(result.data.order.totalAmount === 7500, "total fusionné incorrect");
  });
  await test("Quantité 0, négative, décimale, > 10 ou fusion > 10 → 422", async () => {
    for (const items of [[line("b", 0)], [line("b", -1)], [line("b", 1.5)], [line("b", 11)], [line("b", 6), line("b", 6)], []]) {
      const result = await request("/api/orders", { method: "POST", body: orderPayload(items) });
      assertStatus(result, 422, JSON.stringify(items.map((item) => item.quantity)));
    }
  });
  await test("Coordonnées invalides → 422 avec message et fields", async () => {
    const cases = [
      { email: "pas-un-email" },
      { deliveryAddress: { ...address, postalCode: "750" } },
      { deliveryAddress: { ...address, phone: "abc" } },
      { deliveryAddress: { ...address, firstName: "" } },
    ];
    for (const override of cases) {
      const result = await request("/api/orders", { method: "POST", body: orderPayload([line("b", 1)], override) });
      assertStatus(result, 422, JSON.stringify(override));
      assert(typeof result.data.error === "string" && result.data.fields, "error/fields absents");
    }
  });
  await test("Produit inconnu ou dépublié → 409", async () => {
    const unknown = await request("/api/orders", { method: "POST", body: orderPayload([{ slug: "produit-inexistant", volume: "50 ml", quantity: 1 }]) });
    assertStatus(unknown, 409);
    await request(`/api/admin/products/${products.d.id}`, { method: "PATCH", jar, body: { isActive: false } });
    const inactive = await request("/api/orders", { method: "POST", body: orderPayload([line("d", 1)]) });
    assertStatus(inactive, 409);
    await request(`/api/admin/products/${products.d.id}`, { method: "PATCH", jar, body: { isActive: true } });
  });
  await test("Survente refusée (stock 1, quantité 2) → 409 avec disponible", async () => {
    const result = await request("/api/orders", { method: "POST", body: orderPayload([line("c", 2)]) });
    assertStatus(result, 409);
    assert(result.data.item?.available === 1, `disponible ${JSON.stringify(result.data)}`);
  });
  let winningOrder;
  await test("5 commandes simultanées sur un stock de 1 : une seule réussit", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => request("/api/orders", { method: "POST", body: orderPayload([line("c", 1)]) })));
    const statuses = results.map((result) => result.status).sort();
    const created = results.filter((result) => result.status === 201);
    assert(created.length === 1 && results.filter((result) => result.status === 409).length === 4, `statuts ${statuses.join(",")}`);
    winningOrder = created[0].data.order;
    assert((await stockOf("c")) === 0, "stock non nul après la vente");
  });
  await test("Transitions : statut de préparation refusé tant que non payée", async () => {
    const result = await request(`/api/admin/orders/${winningOrder.id}`, { method: "PATCH", jar, body: { action: "set-status", status: "SHIPPED" } });
    assertStatus(result, 409);
  });
  await test("Annulation → stock restitué, idempotente, commande figée", async () => {
    const cancelled = await request(`/api/admin/orders/${winningOrder.id}`, { method: "PATCH", jar, body: { action: "cancel" } });
    assertStatus(cancelled, 200);
    assert(cancelled.data.order.status === "CANCELLED", "statut non annulé");
    assert((await stockOf("c")) === 1, "stock non restitué");
    const again = await Promise.all([1, 2, 3].map(() => request(`/api/admin/orders/${winningOrder.id}`, { method: "PATCH", jar, body: { action: "cancel" } })));
    assert(again.every((result) => result.status === 200), "annulation répétée en erreur");
    assert((await stockOf("c")) === 1, "stock restitué plusieurs fois");
    assertStatus(await request(`/api/admin/orders/${winningOrder.id}`, { method: "PATCH", jar, body: { action: "confirm-payment" } }), 409, "confirmation d'une commande annulée");
    assertStatus(await request(`/api/admin/orders/${winningOrder.id}`, { method: "PATCH", jar, body: { action: "set-status", status: "SHIPPED" } }), 409, "statut d'une commande annulée");
  });
  await test("Paiement confirmé → préparation → expédiée → livrée ; livrée non annulable", async () => {
    const id = orderBelow.id;
    const paid = await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "confirm-payment" } });
    assert(paid.data.order.paymentStatus === "PAID" && paid.data.order.status === "CONFIRMED", "confirmation");
    const paidAgain = await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "confirm-payment" } });
    assertStatus(paidAgain, 200, "confirmation idempotente");
    for (const status of ["PREPARING", "SHIPPED", "DELIVERED"]) {
      const result = await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "set-status", status } });
      assert(result.status === 200 && result.data.order.status === status, `passage à ${status}`);
    }
    assertStatus(await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "cancel" } }), 409, "annulation d'une commande livrée");
    assertStatus(await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "nimporte" } }), 422, "action inconnue");
  });
  await test("GET commandes (liste filtrée + détail avec référence et montants)", async () => {
    const list = await request("/api/admin/orders?status=DELIVERED", { jar });
    assertStatus(list, 200);
    assert(list.data.orders.every((order) => order.status === "DELIVERED") && list.data.orders.some((order) => order.id === orderBelow.id), "filtre");
    const detail = await request(`/api/admin/orders/${orderBelow.id}`, { jar });
    assert(detail.data.order.reference === orderBelow.reference && detail.data.order.shippingAmount === 590, "détail");
  });

  section("Médias");
  let mediaId;
  await test("Upload PNG valide → 201 (type détecté, nom assaini)", async () => {
    const result = await request("/api/admin/media", { method: "POST", jar, body: uploadForm(PNG_1X1, "../../<script>photo test.jpeg", "image/jpeg") });
    assertStatus(result, 201);
    mediaId = result.data.asset.id;
    assert(result.data.asset.mimeType === "image/png", `type ${result.data.asset.mimeType}`);
    assert(!/[<>/\\]/.test(result.data.asset.filename) && result.data.asset.filename.endsWith(".png"), `nom ${result.data.asset.filename}`);
    assert(result.data.asset.url === `/api/media/${mediaId}`, "url absente");
  });
  await test("GET /api/media/[id] : en-têtes de cache, ETag, 304", async () => {
    const result = await request(`/api/media/${mediaId}`, { raw: true });
    assertStatus(result, 200);
    const headers = result.response.headers;
    assert(headers.get("content-type") === "image/png", "content-type");
    assert(headers.get("cache-control") === "public, max-age=31536000, immutable", `cache-control ${headers.get("cache-control")}`);
    assert(headers.get("x-content-type-options") === "nosniff", "nosniff");
    assert((headers.get("content-disposition") ?? "").startsWith("inline"), "content-disposition");
    const etag = headers.get("etag");
    assert(etag, "etag absent");
    const bytes = Buffer.from(await result.response.arrayBuffer());
    assert(bytes.equals(PNG_1X1), "contenu altéré");
    const cached = await request(`/api/media/${mediaId}`, { raw: true, headers: { "if-none-match": etag } });
    assertStatus(cached, 304);
  });
  await test("Faux PNG (texte), SVG et HTML refusés", async () => {
    const fake = await request("/api/admin/media", { method: "POST", jar, body: uploadForm(Buffer.from("ceci n'est pas une image"), "faux.png", "image/png") });
    assertStatus(fake, 415, "faux PNG");
    const svg = await request("/api/admin/media", { method: "POST", jar, body: uploadForm(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "x.svg", "image/svg+xml") });
    assertStatus(svg, 415, "SVG");
    const html = await request("/api/admin/media", { method: "POST", jar, body: uploadForm(Buffer.from("<html><script>alert(1)</script></html>"), "x.png", "image/png") });
    assertStatus(html, 415, "HTML");
    const empty = await request("/api/admin/media", { method: "POST", jar, body: new FormData() });
    assertStatus(empty, 422, "sans fichier");
  });
  await test("Fichier > 4 Mo refusé (413)", async () => {
    const big = Buffer.alloc(4 * 1024 * 1024 + 10, 0);
    PNG_1X1.copy(big);
    const result = await request("/api/admin/media", { method: "POST", jar, body: uploadForm(big, "gros.png", "image/png") });
    assertStatus(result, 413);
  });
  await test("Suppression d'un média utilisé → 409 listant les usages, ?force=1 → 204", async () => {
    const store = await request("/api/admin/stores", { method: "POST", jar, body: { name: `Boutique média ${RUN}`, address: "1 rue du Test", city: "Paris", country: "France", openingHours: "Lun–Sam", image: `/api/media/${mediaId}`, isActive: false, sortOrder: 0 } });
    assertStatus(store, 201);
    const detail = await request(`/api/admin/media/${mediaId}`, { jar });
    assert(detail.data.usages.length === 1 && detail.data.usages[0].type === "store", "usages non détectés");
    const refused = await request(`/api/admin/media/${mediaId}`, { method: "DELETE", jar });
    assertStatus(refused, 409);
    assert(refused.data.usages?.length === 1 && refused.data.error.includes("Boutique média"), `message ${refused.data.error}`);
    const forced = await request(`/api/admin/media/${mediaId}?force=1`, { method: "DELETE", jar });
    assertStatus(forced, 204);
    assertStatus(await request(`/api/media/${mediaId}`), 404);
    await request(`/api/admin/stores/${store.data.store.id}`, { method: "DELETE", jar });
  });

  section("Newsletter & candidatures");
  const subscriberEmail = `test-${RUN}@example.com`;
  await test("Inscription newsletter (idempotente) + honeypot", async () => {
    assertStatus(await request("/api/newsletter", { method: "POST", body: { email: subscriberEmail } }), 201);
    assertStatus(await request("/api/newsletter", { method: "POST", body: { email: subscriberEmail.toUpperCase() } }), 201);
    assertStatus(await request("/api/newsletter", { method: "POST", body: { email: "invalide" } }), 422);
    assertStatus(await request("/api/newsletter", { method: "POST", body: { email: `bot-${RUN}@example.com`, website: "spam" } }), 201);
  });
  await test("Export CSV newsletter (BOM, en-têtes) + DELETE inscrit", async () => {
    const csv = await request("/api/admin/newsletter?format=csv", { jar, raw: true });
    assertStatus(csv, 200);
    assert((csv.response.headers.get("content-type") ?? "").startsWith("text/csv"), "content-type");
    assert((csv.response.headers.get("content-disposition") ?? "").includes("attachment"), "content-disposition");
    const bytes = Buffer.from(await csv.response.arrayBuffer());
    assert(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, "BOM UTF-8 absent");
    const text = bytes.toString("utf8");
    assert(text.includes(subscriberEmail) && !text.includes(`bot-${RUN}`), "contenu CSV incorrect");
    const list = await request("/api/admin/newsletter", { jar });
    const subscriber = list.data.subscribers.find((entry) => entry.email === subscriberEmail);
    assert(subscriber, "inscrit absent");
    assertStatus(await request(`/api/admin/newsletter/${subscriber.id}`, { method: "DELETE", jar }), 204);
    assertStatus(await request(`/api/admin/newsletter/${subscriber.id}`, { method: "DELETE", jar }), 404);
  });
  await test("Candidature + export CSV protégé contre l'injection de formules", async () => {
    const payload = { firstName: "=HYPERLINK(\"http://x\")", lastName: `Test ${RUN}`, email: `candidate-${RUN}@example.com`, phone: "+33612345678", instagram: "@test", city: "Paris", message: "Je souhaite rejoindre la maison JAE; ligne \"deux\".\nEt une autre ligne." };
    assertStatus(await request("/api/ambassador-applications", { method: "POST", body: payload }), 201);
    assertStatus(await request("/api/ambassador-applications", { method: "POST", body: { ...payload, message: "court" } }), 422);
    const csv = await request("/api/admin/applications?format=csv", { jar, raw: true });
    const text = Buffer.from(await csv.response.arrayBuffer()).toString("utf8");
    assert(text.includes(`"'=HYPERLINK(""http://x"")"`), "formule non neutralisée / guillemets non échappés");
    assert(text.includes('"Je souhaite rejoindre la maison JAE; ligne ""deux"".\nEt une autre ligne."'), "échappement du message incorrect");
    const list = await request("/api/admin/applications?status=NEW", { jar });
    const application = list.data.applications.find((entry) => entry.lastName === `Test ${RUN}`);
    assert(application, "candidature absente");
    assertStatus(await request(`/api/admin/applications/${application.id}`, { method: "PATCH", jar, body: { status: "CONTACTED" } }), 200);
    assertStatus(await request(`/api/admin/applications/${application.id}`, { method: "PATCH", jar, body: { status: "INCONNU" } }), 422);
    assertStatus(await request(`/api/admin/applications/${application.id}`, { method: "DELETE", jar }), 204);
  });

  section("Limiteur de débit");
  await test("Newsletter : 11e inscription en 1 h depuis la même IP → 429 + Retry-After", async () => {
    const ip = `10.250.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const statuses = [];
    let last;
    for (let index = 0; index < 11; index += 1) {
      last = await request("/api/newsletter", { method: "POST", ip, body: { email: `rl-${RUN}-${index}@example.com` } });
      statuses.push(last.status);
    }
    assert(statuses.slice(0, 10).every((status) => status === 201), `statuts ${statuses.join(",")}`);
    assertStatus(last, 429);
    assert(Number(last.response.headers.get("retry-after")) > 0, "Retry-After absent");
    assert(/réessayer/i.test(last.data.error), "message FR absent");
    // Nettoyage des adresses de test.
    const list = await request("/api/admin/newsletter", { jar });
    for (const subscriber of list.data.subscribers.filter((entry) => entry.email.startsWith(`rl-${RUN}-`))) {
      await request(`/api/admin/newsletter/${subscriber.id}`, { method: "DELETE", jar });
    }
  });
  await test("Commandes : 11e commande en 10 min depuis la même IP → 429", async () => {
    const ip = `10.251.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const created = [];
    let last;
    for (let index = 0; index < 11; index += 1) {
      last = await request("/api/orders", { method: "POST", ip, body: orderPayload([line("b", 1)]) });
      if (last.status === 201) created.push(last.data.order.id);
    }
    assert(created.length === 10, `${created.length} commandes créées`);
    assertStatus(last, 429);
    assert(Number(last.response.headers.get("retry-after")) > 0, "Retry-After absent");
    for (const id of created) await request(`/api/admin/orders/${id}`, { method: "PATCH", jar, body: { action: "cancel" } });
  });
  await test("Candidatures : 6e candidature en 1 h depuis la même IP → 429", async () => {
    const ip = `10.252.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    let last;
    for (let index = 0; index < 6; index += 1) {
      last = await request("/api/ambassador-applications", { method: "POST", ip, body: { firstName: "Rate", lastName: `Limit ${RUN}`, email: `rl-${RUN}@example.com`, message: "Message de candidature suffisamment long." } });
    }
    assertStatus(last, 429);
    const list = await request("/api/admin/applications", { jar });
    for (const application of list.data.applications.filter((entry) => entry.lastName === `Limit ${RUN}`)) {
      await request(`/api/admin/applications/${application.id}`, { method: "DELETE", jar });
    }
  });

  section("Nettoyage & déconnexion");
  await test("Commandes de test annulées, produits de test dépubliés", async () => {
    const orders = await request("/api/admin/orders", { jar });
    for (const order of orders.data.orders.filter((entry) => entry.email === "client.test@example.com" && !["CANCELLED", "DELIVERED"].includes(entry.status))) {
      await request(`/api/admin/orders/${order.id}`, { method: "PATCH", jar, body: { action: "cancel" } });
    }
    for (const product of Object.values(products)) {
      const result = await request(`/api/admin/products/${product.id}`, { method: "PATCH", jar, body: { isActive: false } });
      assertStatus(result, 200);
    }
  });
  await test("Déconnexion : la session est supprimée", async () => {
    const csrf = await request("/api/auth/csrf", { jar });
    const response = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: jar.header(), "content-type": "application/x-www-form-urlencoded", "x-auth-return-redirect": "1" },
      body: new URLSearchParams({ csrfToken: csrf.data.csrfToken, callbackUrl: `${BASE_URL}/connexion-admin` }),
    });
    jar.absorb(response);
    const after = await request("/api/admin/products", { jar });
    assertStatus(after, 401);
  });

  console.info(`\n${passed} test(s) réussi(s), ${failures.length} échec(s).`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Erreur fatale :", error);
  process.exitCode = 1;
});
