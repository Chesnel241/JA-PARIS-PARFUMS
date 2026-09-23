import { test, expect } from "../fixtures";
import {
  createProduct,
  expectStatus,
  orderPayload,
  productPayload,
  removeProduct,
  variantStock,
  type AdminProduct,
  type CreatedOrder,
} from "../helpers/factories";

// POST /api/orders — contrat public de création de commande.
// Chaque test travaille sur un produit créé pour l'occasion (stock maîtrisé).

const SHIPPING_FEE = 590; // 5,90 €
const FREE_SHIPPING_THRESHOLD = 5000; // 50 €

test.describe("API publique — commandes", () => {
  let product: AdminProduct;

  test.beforeAll(async ({ adminRequest }) => {
    product = await createProduct(
      adminRequest,
      productPayload({
        variants: [
          { volume: "30 ml", price: 1990, stock: 500 },
          { volume: "50 ml", price: 2500, stock: 500 },
          { volume: "100 ml", price: 6000, stock: 500 },
          { volume: "10 ml", price: 1500, stock: 500, isActive: false },
        ],
      }),
    );
  });

  test.afterAll(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  test("commande valide : 201, prix et nom recalculés côté serveur, livraison 5,90 € sous 50 €, stock décrémenté", async ({ request, adminRequest }) => {
    const before = await variantStock(adminRequest, product.id, "30 ml");
    const response = await request.post("/api/orders", {
      data: orderPayload([{ slug: product.slug, volume: "30 ml", quantity: 2, price: 1, name: "Nom falsifié" }]),
    });
    await expectStatus(response, 201);
    const { order } = (await response.json()) as { order: CreatedOrder };

    expect(order.id).toBeTruthy();
    expect(order.status).toBe("PENDING");
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.items).toHaveLength(1);
    expect(order.items[0].price, "le prix unitaire doit venir de la base, pas du client").toBe(1990);
    expect(order.items[0].name).toBe(product.name);
    expect(order.items[0].quantity).toBe(2);
    // 2 × 19,90 € = 39,80 € < 50 € → + 5,90 €
    expect(order.totalAmount).toBe(2 * 1990 + SHIPPING_FEE);
    expect(await variantStock(adminRequest, product.id, "30 ml")).toBe(before - 2);
  });

  test("livraison offerte dès 50 € (seuil exact inclus)", async ({ request }) => {
    const exact = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 2 }]) });
    await expectStatus(exact, 201);
    expect(((await exact.json()) as { order: CreatedOrder }).order.totalAmount).toBe(FREE_SHIPPING_THRESHOLD);

    const above = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "100 ml", quantity: 1 }]) });
    await expectStatus(above, 201);
    expect(((await above.json()) as { order: CreatedOrder }).order.totalAmount).toBe(6000);
  });

  test("panier multi-lignes : total = somme des lignes, livraison calculée sur le sous-total", async ({ request }) => {
    const response = await request.post("/api/orders", {
      data: orderPayload([
        { slug: product.slug, volume: "30 ml", quantity: 1 },
        { slug: product.slug, volume: "50 ml", quantity: 1 },
      ]),
    });
    await expectStatus(response, 201);
    const { order } = (await response.json()) as { order: CreatedOrder };
    expect(order.items).toHaveLength(2);
    expect(order.totalAmount).toBe(1990 + 2500 + SHIPPING_FEE);
  });

  for (const quantity of [0, -1, 1.5]) {
    test(`quantité invalide (${quantity}) → 422`, async ({ request, adminRequest }) => {
      const before = await variantStock(adminRequest, product.id, "30 ml");
      const response = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "30 ml", quantity }]) });
      await expectStatus(response, 422);
      expect(await variantStock(adminRequest, product.id, "30 ml")).toBe(before);
    });
  }

  test("quantité énorme → 422 (validation, avant toute requête de stock)", async ({ request, adminRequest }) => {
    const before = await variantStock(adminRequest, product.id, "30 ml");
    for (const quantity of [1_000_000, 2 ** 31, Number.MAX_SAFE_INTEGER]) {
      const response = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "30 ml", quantity }]) });
      await expectStatus(response, 422, `quantité ${quantity}`);
    }
    expect(await variantStock(adminRequest, product.id, "30 ml")).toBe(before);
  });

  test("variante inconnue ou désactivée refusée, produit inconnu refusé", async ({ request }) => {
    const unknownVolume = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "999 ml", quantity: 1 }]) });
    await expectStatus(unknownVolume, [404, 409, 422], "volume inconnu");

    const inactiveVariant = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "10 ml", quantity: 1 }]) });
    await expectStatus(inactiveVariant, [404, 409, 422], "variante désactivée");

    const unknownProduct = await request.post("/api/orders", { data: orderPayload([{ slug: "qa-produit-inexistant", volume: "30 ml", quantity: 1 }]) });
    await expectStatus(unknownProduct, [404, 409, 422], "produit inconnu");
  });

  test("payloads invalides → 422 (JSON cassé, corps vide, email invalide, panier vide, adresse manquante)", async ({ request }) => {
    const broken = await request.post("/api/orders", { data: "{ pas du json", headers: { "content-type": "application/json" } });
    await expectStatus(broken, 422, "JSON invalide");

    const empty = await request.post("/api/orders", { data: "", headers: { "content-type": "application/json" } });
    await expectStatus(empty, 422, "corps vide");

    const valid = orderPayload([{ slug: product.slug, volume: "30 ml", quantity: 1 }]);
    const badEmail = await request.post("/api/orders", { data: { ...valid, email: "pas-un-email" } });
    await expectStatus(badEmail, 422, "email invalide");

    const noItems = await request.post("/api/orders", { data: { ...valid, items: [] } });
    await expectStatus(noItems, 422, "panier vide");

    const noAddress = await request.post("/api/orders", { data: { email: valid.email, items: valid.items } });
    await expectStatus(noAddress, 422, "adresse manquante");
  });
});

test.describe("API publique — stock et concurrence", () => {
  test("survente refusée (409) et stock inchangé", async ({ request, adminRequest }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 2 }] }));
    try {
      const response = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 3 }]) });
      await expectStatus(response, 409);
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(2);

      // Une commande multi-lignes dont UNE ligne est en survente ne décrémente rien.
      const partial = await request.post("/api/orders", {
        data: orderPayload([
          { slug: product.slug, volume: "50 ml", quantity: 1 },
          { slug: product.slug, volume: "50 ml", quantity: 2 },
        ]),
      });
      await expectStatus(partial, [409, 422], "lignes cumulées > stock");
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(2);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });

  test("5 commandes concurrentes sur un stock de 1 : une seule réussit, stock final 0", async ({ playwright, adminRequest, baseURL }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 1 }] }));
    // Contextes HTTP indépendants → vraies connexions parallèles.
    const clients = await Promise.all(Array.from({ length: 5 }, () => playwright.request.newContext({ baseURL })));
    try {
      const responses = await Promise.all(
        clients.map((client) => client.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 1 }]) })),
      );
      const statuses = responses.map((response) => response.status()).sort();
      expect(statuses.filter((status) => status === 201), `statuts : ${statuses.join(", ")}`).toHaveLength(1);
      expect(statuses.filter((status) => status === 409), `statuts : ${statuses.join(", ")}`).toHaveLength(4);
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(0);
    } finally {
      await Promise.all(clients.map((client) => client.dispose()));
      await removeProduct(adminRequest, product.id);
    }
  });

  test("un produit désactivé (dépublié) ne peut plus être commandé", async ({ request, adminRequest }) => {
    const product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 5 }] }));
    try {
      await expectStatus(await adminRequest.patch(`/api/admin/products/${product.id}`, { data: { isActive: false } }), 200);
      const response = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity: 1 }]) });
      await expectStatus(response, [404, 409, 422], "commande d'un produit désactivé");
      expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(5);
    } finally {
      await removeProduct(adminRequest, product.id);
    }
  });
});
