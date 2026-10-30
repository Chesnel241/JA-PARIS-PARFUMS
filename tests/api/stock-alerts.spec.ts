import { test, expect } from "../fixtures";
import { findStockAlerts } from "../helpers/admin-api";
import { uniqueForwardedFor } from "../helpers/auth";
import { createProduct, expectStatus, productPayload, removeProduct, uniqueEmail, type AdminProduct } from "../helpers/factories";

// « M'avertir du retour » : POST /api/stock-alerts (public) et suivi dans l'admin.
// Chaque test utilise sa propre IP (X-Forwarded-For) pour ne pas épuiser le limiteur.

test.describe("API publique — alertes de retour en stock", () => {
  let product: AdminProduct;

  test.beforeAll(async ({ adminRequest }) => {
    product = await createProduct(adminRequest, productPayload({
      variants: [{ volume: "50 ml", price: 7000, stock: 0 }, { volume: "100 ml", price: 9500, stock: 5 }],
    }));
  });
  test.afterAll(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  const post = (request: import("@playwright/test").APIRequestContext, data: Record<string, unknown>, headers: Record<string, string> = {}) =>
    request.post("/api/stock-alerts", { data, headers: { "x-forwarded-for": uniqueForwardedFor(), ...headers } });

  test("contenance épuisée → 201, enregistrée une seule fois (idempotent), visible dans l'admin", async ({ request, adminRequest }) => {
    const email = uniqueEmail("alerte");
    await expectStatus(await post(request, { email, slug: product.slug, volume: "50 ml" }), 201);
    await expectStatus(await post(request, { email: email.toUpperCase(), slug: product.slug, volume: "50 ml" }), 201);
    const alerts = await findStockAlerts(adminRequest, email);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ volume: "50 ml", stock: 0, notifiedAt: null, product: { id: product.id } });

    // Marquée prévenue puis supprimée depuis l'admin.
    const patched = await adminRequest.patch(`/api/admin/stock-alerts/${alerts[0].id}`, { data: { notified: true } });
    await expectStatus(patched, 200);
    expect((await findStockAlerts(adminRequest, email))[0].notifiedAt).not.toBeNull();
    await expectStatus(await adminRequest.delete(`/api/admin/stock-alerts/${alerts[0].id}`), 204);
    expect(await findStockAlerts(adminRequest, email)).toHaveLength(0);
  });

  test("contenance en stock → 409 ; produit ou contenance inconnus → 404", async ({ request }) => {
    const email = uniqueEmail("alerte-refus");
    await expectStatus(await post(request, { email, slug: product.slug, volume: "100 ml" }), 409);
    await expectStatus(await post(request, { email, slug: product.slug, volume: "30 ml" }), 404);
    await expectStatus(await post(request, { email, slug: "qa-produit-inexistant", volume: "50 ml" }), 404);
  });

  test("données invalides → 422, rien d'enregistré", async ({ request, adminRequest }) => {
    await expectStatus(await post(request, { email: "pas-un-email", slug: product.slug, volume: "50 ml" }), 422);
    await expectStatus(await post(request, { email: uniqueEmail("alerte"), slug: "../../etc", volume: "50 ml" }), 422);
    await expectStatus(await post(request, { email: uniqueEmail("alerte"), slug: product.slug, volume: "x".repeat(40) }), 422);
    const email = uniqueEmail("alerte-invalide");
    await expectStatus(await post(request, { email, slug: product.slug }), 422);
    expect(await findStockAlerts(adminRequest, email)).toHaveLength(0);
  });

  test("pot de miel rempli → 201 mais rien en base", async ({ request, adminRequest }) => {
    const email = uniqueEmail("alerte-robot");
    await expectStatus(await post(request, { email, slug: product.slug, volume: "50 ml", website: "https://spam.example.com" }), 201);
    expect(await findStockAlerts(adminRequest, email)).toHaveLength(0);
  });

  test("requête depuis un autre site (Origin étranger) → 403", async ({ request, adminRequest }) => {
    const email = uniqueEmail("alerte-csrf");
    await expectStatus(await post(request, { email, slug: product.slug, volume: "50 ml" }, { origin: "https://evil.example.com" }), 403);
    expect(await findStockAlerts(adminRequest, email)).toHaveLength(0);
  });
});
