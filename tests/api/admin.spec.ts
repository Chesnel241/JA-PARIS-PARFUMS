import { test, expect } from "../fixtures";
import { findApplications, uploadMedia } from "../helpers/admin-api";
import {
  ambassadorPayload,
  applicationPayload,
  articlePayload,
  createProduct,
  expectStatus,
  orderPayload,
  productPayload,
  removeProduct,
  storePayload,
  variantStock,
  type CreatedOrder,
} from "../helpers/factories";
import { createJpeg, createPng } from "../helpers/images";

// Administration via l'API (session admin du projet setup), avec vérification
// de la synchronisation côté site public (HTML rendu serveur).

test.describe("Admin — produits", () => {
  test("création → visible sur /boutique, /produit/<slug>, /recherche et le sitemap ; modification synchronisée", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 4200, stock: 3 }] }));
    try {
      expect(product.id).toBeTruthy();
      const shop = await (await request.get("/boutique")).text();
      expect(shop).toContain(product.name);
      expect(shop).toContain(`/produit/${product.slug}`);

      const page = await request.get(`/produit/${product.slug}`);
      await expectStatus(page, 200);
      expect(await page.text()).toContain(product.name);

      const sitemap = await (await request.get("/sitemap.xml")).text();
      expect(sitemap).toContain(`/produit/${product.slug}</loc>`);

      const renamed = `${product.name} Édition`;
      const updated = await adminRequest.put(`/api/admin/products/${product.id}`, {
        data: productPayload({ slug: product.slug, name: renamed, variants: [{ sku: product.variants[0].sku, volume: "50 ml", price: 4500, stock: 3 }] }),
      });
      await expectStatus(updated, 200);
      const html = await (await request.get(`/produit/${product.slug}`)).text();
      expect(html).toContain(renamed);
      expect(html).toMatch(/45\s*€/);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("accessoire → visible sur /accessoires et pas sur /boutique", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload({ category: "ACCESSOIRE", notesTop: [], notesHeart: [], notesBase: [] }));
    try {
      expect(await (await request.get("/accessoires")).text()).toContain(product.name);
      expect(await (await request.get("/boutique")).text()).not.toContain(product.name);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("désactivation → disparaît des listes, du sitemap et de la fiche", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload());
    try {
      await expectStatus(await adminRequest.patch(`/api/admin/products/${product.id}`, { data: { isActive: false } }), 200);
      expect(await (await request.get("/boutique")).text()).not.toContain(product.name);
      expect(await (await request.get("/sitemap.xml")).text()).not.toContain(`/produit/${product.slug}<`);
      const page = await request.get(`/produit/${product.slug}`);
      expect(await page.text()).not.toContain(`<h1>${product.name}</h1>`);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("désactivation → la fiche répond 404", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload());
    try {
      await expectStatus(await adminRequest.patch(`/api/admin/products/${product.id}`, { data: { isActive: false } }), 200);
      await expectStatus(await request.get(`/produit/${product.slug}`), 404);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("validation : payload invalide → 422, slug dupliqué → 409, suppression → 204 puis 404", async ({ adminRequest }) => {
    await expectStatus(await adminRequest.post("/api/admin/products", { data: { name: "x" } }), 422);
    await expectStatus(await adminRequest.post("/api/admin/products", { data: productPayload({ images: ["javascript:alert(1)"] }) }), 422, "image javascript:");
    const product = await createProduct(adminRequest, productPayload());
    await expectStatus(await adminRequest.post("/api/admin/products", { data: productPayload({ slug: product.slug }) }), 409, "slug dupliqué");
    await expectStatus(await adminRequest.delete(`/api/admin/products/${product.id}`), 204);
    await expectStatus(await adminRequest.get(`/api/admin/products/${product.id}`), 404);
  });
});

test.describe("Admin — commandes", () => {
  test("confirmer le paiement, changer le statut, annuler → stock restauré (idempotent)", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 10 }] }));
    try {
      const created = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 3 }]) });
      await expectStatus(created, 201);
      const { order } = (await created.json()) as { order: CreatedOrder };
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(7);

      const patch = async (data: object, status = 200) => {
        const response = await adminRequest.patch(`/api/admin/orders/${order.id}`, { data });
        await expectStatus(response, status, JSON.stringify(data));
        return response.status() === 200 ? ((await response.json()) as { order: CreatedOrder }).order : undefined;
      };

      const paid = await patch({ action: "confirm-payment" });
      expect(paid?.paymentStatus).toBe("PAID");
      expect(paid?.status).toBe("CONFIRMED");
      expect(await variantStock(adminRequest, product.id, "50 ml"), "confirmer ne touche pas au stock").toBe(7);

      expect((await patch({ action: "set-status", status: "SHIPPED" }))?.status).toBe("SHIPPED");
      await patch({ action: "set-status", status: "CANCELLED" }, 422);
      await patch({ action: "inconnue" }, 422);

      const cancelled = await patch({ action: "cancel" });
      expect(cancelled?.status).toBe("CANCELLED");
      expect(cancelled?.paymentStatus).toBe("REFUNDED");
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(10);

      await patch({ action: "cancel" });
      expect(await variantStock(adminRequest, product.id, "50 ml"), "annuler deux fois ne restitue pas deux fois").toBe(10);
      await patch({ action: "confirm-payment" }, 409);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  // BUG: setOrderStatus ne refuse pas une commande CANCELLED (src/lib/order-service.ts) : une commande
  // annulée (stock déjà restitué) peut repasser en SHIPPED/DELIVERED → stock et CA incohérents.
  test.fixme("une commande annulée ne peut plus repasser en préparation/expédiée", async ({ adminRequest, request }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 5 }] }));
    try {
      const created = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 1 }]) });
      const { order } = (await created.json()) as { order: CreatedOrder };
      await expectStatus(await adminRequest.patch(`/api/admin/orders/${order.id}`, { data: { action: "cancel" } }), 200);
      const reopened = await adminRequest.patch(`/api/admin/orders/${order.id}`, { data: { action: "set-status", status: "SHIPPED" } });
      await expectStatus(reopened, [409, 422], "set-status sur commande annulée");
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("commande inconnue → 404 ; un produit commandé ne peut pas être supprimé (409)", async ({ adminRequest, request }) => {
    await expectStatus(await adminRequest.patch("/api/admin/orders/qa-commande-inexistante", { data: { action: "cancel" } }), 404);
    const product = await createProduct(adminRequest, productPayload());
    try {
      await expectStatus(await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "30 ml", quantity: 1 }]) }), 201);
      await expectStatus(await adminRequest.delete(`/api/admin/products/${product.id}`), 409);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });
});

test.describe("Admin — articles du Journal", () => {
  test("publié → visible sur /journal, /journal/<slug> et /api/articles ; dépublié → absent", async ({ adminRequest, request }) => {
    const payload = articlePayload();
    const created = await adminRequest.post("/api/admin/articles", { data: payload });
    await expectStatus(created, 201);
    const { article } = (await created.json()) as { article: { id: string } };
    try {
      expect(await (await request.get("/journal")).text()).toContain(payload.title);
      const page = await request.get(`/journal/${payload.slug}`);
      await expectStatus(page, 200);
      expect(await page.text()).toContain(payload.title);
      const list = (await (await request.get("/api/articles")).json()) as { articles: { slug: string }[] };
      expect(list.articles.map((item) => item.slug)).toContain(payload.slug);

      await expectStatus(await adminRequest.patch(`/api/admin/articles/${article.id}`, { data: { isPublished: false } }), 200);
      expect(await (await request.get("/journal")).text()).not.toContain(payload.title);
      expect(await (await request.get(`/journal/${payload.slug}`)).text()).not.toContain(payload.excerpt);
      const after = (await (await request.get("/api/articles")).json()) as { articles: { slug: string }[] };
      expect(after.articles.map((item) => item.slug)).not.toContain(payload.slug);
    } finally {
      await adminRequest.delete(`/api/admin/articles/${article.id}`);
    }
  });

  test("article dépublié → /journal/<slug> répond 404", async ({ adminRequest, request }) => {
    const payload = articlePayload({ isPublished: false });
    const created = await adminRequest.post("/api/admin/articles", { data: payload });
    await expectStatus(created, 201);
    const { article } = (await created.json()) as { article: { id: string } };
    try {
      await expectStatus(await request.get(`/journal/${payload.slug}`), 404);
    } finally {
      await adminRequest.delete(`/api/admin/articles/${article.id}`);
    }
  });

  test("validation : slug dupliqué → 409, couverture javascript: → 422", async ({ adminRequest }) => {
    const payload = articlePayload({ isPublished: false });
    const created = await adminRequest.post("/api/admin/articles", { data: payload });
    const { article } = (await created.json()) as { article: { id: string } };
    try {
      await expectStatus(await adminRequest.post("/api/admin/articles", { data: payload }), 409);
      await expectStatus(await adminRequest.post("/api/admin/articles", { data: articlePayload({ coverImage: "javascript:alert(1)" }) }), 422);
    } finally {
      await adminRequest.delete(`/api/admin/articles/${article.id}`);
    }
  });
});

test.describe("Admin — médias et apparence", () => {
  for (const [label, file] of [
    ["PNG", { name: "qa.png", mimeType: "image/png", buffer: createPng() }],
    ["JPEG", { name: "qa.jpg", mimeType: "image/jpeg", buffer: createJpeg() }],
  ] as const) {
    test(`upload ${label} → servi par /api/media/<id> avec le bon content-type, puis suppression`, async ({ adminRequest, request }) => {
      const response = await uploadMedia(adminRequest, file);
      await expectStatus(response, 201);
      const { asset } = (await response.json()) as { asset: { id: string; url: string; mimeType: string } };
      expect(asset.url).toBe(`/api/media/${asset.id}`);

      const served = await request.get(asset.url);
      await expectStatus(served, 200);
      expect(served.headers()["content-type"]).toBe(file.mimeType);
      expect(served.headers()["x-content-type-options"]).toBe("nosniff");
      expect(Buffer.compare(await served.body(), file.buffer)).toBe(0);

      const list = (await (await adminRequest.get("/api/admin/media")).json()) as { assets: { id: string }[] };
      expect(list.assets.map((item) => item.id)).toContain(asset.id);

      await expectStatus(await adminRequest.delete(`/api/admin/media/${asset.id}`), 204);
      await expectStatus(await request.get(asset.url), 404);
    });
  }

  test("réglage d'apparence → l'URL apparaît sur l'accueil, puis retour au défaut", async ({ adminRequest, request }) => {
    const upload = await uploadMedia(adminRequest, { name: "qa-apparence.png", mimeType: "image/png", buffer: createPng(32, 24) });
    await expectStatus(upload, 201);
    const { asset } = (await upload.json()) as { asset: { id: string; url: string } };
    try {
      const saved = await adminRequest.put("/api/admin/settings", { data: { key: "home.hero.card", value: asset.url } });
      await expectStatus(saved, 200);
      expect(((await saved.json()) as { images: Record<string, string> }).images["home.hero.card"]).toBe(asset.url);
      expect(await (await request.get("/")).text()).toContain(asset.url);

      await expectStatus(await adminRequest.put("/api/admin/settings", { data: { key: "home.hero.card", value: "javascript:alert(1)" } }), 422);
      await expectStatus(await adminRequest.put("/api/admin/settings", { data: { key: "cle.inconnue", value: "/craft.jpg" } }), 422);
    } finally {
      await adminRequest.put("/api/admin/settings", { data: { key: "home.hero.card", value: "" } });
      await adminRequest.delete(`/api/admin/media/${asset.id}`);
    }
    expect(await (await request.get("/")).text()).not.toContain(asset.url);
  });
});

test.describe("Admin — ambassadrices, boutiques, candidatures", () => {
  // BUG: /ambassadrices affiche une liste codée en dur (src/app/(site)/ambassadrices/page.tsx) au lieu de
  // getPublicAmbassadors() : les ambassadrices gérées dans l'admin n'apparaissent jamais.
  test.fixme("ambassadrice créée → visible sur /ambassadrices ; désactivée → absente", async ({ adminRequest, request }) => {
    const payload = ambassadorPayload();
    const created = await adminRequest.post("/api/admin/ambassadors", { data: payload });
    await expectStatus(created, 201);
    const { ambassador } = (await created.json()) as { ambassador: { id: string } };
    try {
      expect(await (await request.get("/ambassadrices")).text()).toContain(payload.name);
      await expectStatus(await adminRequest.patch(`/api/admin/ambassadors/${ambassador.id}`, { data: { isActive: false } }), 200);
      expect(await (await request.get("/ambassadrices")).text()).not.toContain(payload.name);
    } finally {
      await adminRequest.delete(`/api/admin/ambassadors/${ambassador.id}`);
    }
  });

  // BUG: /boutiques affiche une liste codée en dur (src/app/(site)/boutiques/page.tsx) au lieu de
  // getPublicStores() : les boutiques gérées dans l'admin n'apparaissent jamais.
  test.fixme("boutique créée → visible sur /boutiques ; désactivée → absente", async ({ adminRequest, request }) => {
    const payload = storePayload();
    const created = await adminRequest.post("/api/admin/stores", { data: payload });
    await expectStatus(created, 201);
    const { store } = (await created.json()) as { store: { id: string } };
    try {
      expect(await (await request.get("/boutiques")).text()).toContain(payload.name);
      await expectStatus(await adminRequest.patch(`/api/admin/stores/${store.id}`, { data: { isActive: false } }), 200);
      expect(await (await request.get("/boutiques")).text()).not.toContain(payload.name);
    } finally {
      await adminRequest.delete(`/api/admin/stores/${store.id}`);
    }
  });

  test("CRUD ambassadrice/boutique via l'API (sans dépendre du rendu public)", async ({ adminRequest }) => {
    const amb = await adminRequest.post("/api/admin/ambassadors", { data: ambassadorPayload() });
    await expectStatus(amb, 201);
    const { ambassador } = (await amb.json()) as { ambassador: { id: string } };
    await expectStatus(await adminRequest.put(`/api/admin/ambassadors/${ambassador.id}`, { data: ambassadorPayload({ name: "Renommée QA" }) }), 200);
    expect(((await (await adminRequest.get(`/api/admin/ambassadors/${ambassador.id}`)).json()) as { ambassador: { name: string } }).ambassador.name).toBe("Renommée QA");
    await expectStatus(await adminRequest.post("/api/admin/ambassadors", { data: { name: "x" } }), 422);
    await expectStatus(await adminRequest.delete(`/api/admin/ambassadors/${ambassador.id}`), 204);
    await expectStatus(await adminRequest.get(`/api/admin/ambassadors/${ambassador.id}`), 404);

    const st = await adminRequest.post("/api/admin/stores", { data: storePayload() });
    await expectStatus(st, 201);
    const { store } = (await st.json()) as { store: { id: string } };
    await expectStatus(await adminRequest.delete(`/api/admin/stores/${store.id}`), 204);
    await expectStatus(await adminRequest.delete(`/api/admin/stores/${store.id}`), 404);
  });

  test("candidature → changement de statut, filtre par statut, suppression", async ({ adminRequest, request }) => {
    const payload = applicationPayload();
    await expectStatus(await request.post("/api/ambassador-applications", { data: payload }), 201);
    const [application] = await findApplications(adminRequest, payload.email);
    expect(application?.status).toBe("NEW");

    const updated = await adminRequest.patch(`/api/admin/applications/${application.id}`, { data: { status: "CONTACTED" } });
    await expectStatus(updated, 200);
    const filtered = (await (await adminRequest.get("/api/admin/applications?status=CONTACTED")).json()) as { applications: { id: string; status: string }[] };
    expect(filtered.applications.map((item) => item.id)).toContain(application.id);
    expect(filtered.applications.every((item) => item.status === "CONTACTED")).toBe(true);

    await expectStatus(await adminRequest.patch(`/api/admin/applications/${application.id}`, { data: { status: "INVALIDE" } }), 422);
    await expectStatus(await adminRequest.delete(`/api/admin/applications/${application.id}`), 204);
    expect(await findApplications(adminRequest, payload.email)).toHaveLength(0);
  });
});
