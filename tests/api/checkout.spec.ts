import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../fixtures";
import { createProduct, expectStatus, orderPayload, productPayload, removeProduct, variantStock, type AdminProduct, type CreatedOrder } from "../helpers/factories";
import { hasWebhookSecret, payCheckout, signedWebhook, type CardCheckout } from "../helpers/stripe";

// Paiement par carte (Stripe Checkout), contre l'API Stripe simulée
// (tests/helpers/stripe-mock.mjs) : session, paiement, abandon, webhooks signés.

type Created = { order: CreatedOrder; payment: CardCheckout };

test.describe("API publique — paiement par carte", () => {
  let product: AdminProduct;

  test.beforeAll(async ({ adminRequest }) => {
    product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: 3000, stock: 200 }] }));
  });
  test.afterAll(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  async function placeOrder(request: APIRequestContext, quantity = 1): Promise<Created> {
    const response = await request.post("/api/orders", { data: orderPayload([{ slug: product.slug, volume: "50 ml", quantity }]) });
    await expectStatus(response, 201);
    return (await response.json()) as Created;
  }

  test("commande → session Stripe : URL de paiement, référence et montant", async ({ request }) => {
    const { order, payment } = await placeOrder(request);
    expect(payment.method).toBe("stripe");
    expect(payment.sessionId).toMatch(/^cs_test_/);
    expect(payment.url).toMatch(/^https?:\/\//);
    expect(payment.reference).toBe(order.reference);
    expect(payment.amount).toBe(order.totalAmount);
    expect(Date.parse(payment.expiresAt)).toBeGreaterThan(Date.now() + 30 * 60_000);
  });

  test("paiement accepté → « paid », commande confirmée, stock inchangé", async ({ request, adminRequest }) => {
    const before = await variantStock(adminRequest, product.id, "50 ml");
    const { order, payment } = await placeOrder(request, 2);
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before - 2);

    const pending = await request.get(`/api/checkout/status?session_id=${payment.sessionId}`);
    await expectStatus(pending, 200);
    expect((await pending.json()).state).toBe("open");

    await payCheckout(request, payment.sessionId);
    const status = await request.get(`/api/checkout/status?session_id=${payment.sessionId}`);
    const body = await status.json();
    expect(body.state).toBe("paid");
    expect(body.order.reference).toBe(order.reference);
    expect(body.order.totalAmount).toBe(order.totalAmount);
    expect(body.order, "aucune donnée interne exposée").not.toHaveProperty("id");
    expect(body.order).not.toHaveProperty("deliveryAddress");

    const admin = (await (await adminRequest.get(`/api/admin/orders/${order.id}`)).json()).order;
    expect(admin.paymentStatus).toBe("PAID");
    expect(admin.status).toBe("CONFIRMED");
    expect(admin.stripePaymentIntentId).toMatch(/^pi_test_/);
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before - 2);

    const cancel = await request.post("/api/checkout/cancel", { data: { sessionId: payment.sessionId } });
    expect((await cancel.json()).state, "une commande payée n'est jamais annulée par le client").toBe("paid");
  });

  test("abandon → session fermée, commande annulée, stock restitué une seule fois", async ({ request, adminRequest }) => {
    const before = await variantStock(adminRequest, product.id, "50 ml");
    const { order, payment } = await placeOrder(request, 3);
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before - 3);

    const cancel = await request.post("/api/checkout/cancel", { data: { sessionId: payment.sessionId } });
    await expectStatus(cancel, 200);
    expect((await cancel.json()).state).toBe("cancelled");
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before);
    expect((await (await adminRequest.get(`/api/admin/orders/${order.id}`)).json()).order.status).toBe("CANCELLED");

    await request.post("/api/checkout/cancel", { data: { sessionId: payment.sessionId } });
    expect(await variantStock(adminRequest, product.id, "50 ml"), "pas de double restitution").toBe(before);
    const lateAttempt = await request.get(payment.url.replace(/\/?$/, "/complete"), { maxRedirects: 0 });
    expect(lateAttempt.status(), "la page de paiement est fermée").toBe(400);
  });

  test("webhook signé : session expirée → stock restitué (idempotent)", async ({ request, adminRequest }) => {
    test.skip(!hasWebhookSecret(), "STRIPE_WEBHOOK_SECRET absente de l'environnement de test");
    const before = await variantStock(adminRequest, product.id, "50 ml");
    const { order, payment } = await placeOrder(request, 1);
    const event = signedWebhook("checkout.session.expired", {
      id: payment.sessionId, object: "checkout.session", client_reference_id: order.id,
      metadata: { orderId: order.id, reference: order.reference }, status: "expired", payment_status: "unpaid",
    });
    const send = () => request.post("/api/stripe/webhook", { headers: { "content-type": "application/json", "stripe-signature": event.signature }, data: event.payload });

    const first = await send();
    await expectStatus(first, 200);
    expect((await first.json()).result).toBe("released");
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before);
    expect((await (await send()).json()).result, "événement rejoué").toBe("unchanged");
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(before);
  });

  test("webhook : signature absente ou falsifiée → 400, rien n'est traité", async ({ request }) => {
    const unsigned = await request.post("/api/stripe/webhook", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ type: "checkout.session.completed", data: { object: { metadata: { orderId: "x" }, payment_status: "paid" } } }),
    });
    expect(unsigned.status()).toBe(400);
    const forged = await request.post("/api/stripe/webhook", {
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
      data: "{}",
    });
    expect(forged.status()).toBe(400);
  });

  test("statut et annulation : identifiants validés, origine étrangère refusée", async ({ request }) => {
    expect((await request.get("/api/checkout/status?session_id=../../etc/passwd")).status()).toBe(422);
    expect((await request.get("/api/checkout/status?session_id=cs_test_qa0000000000000000unknown")).status()).toBe(404);
    const crossSite = await request.post("/api/checkout/cancel", {
      headers: { origin: "https://evil.example" },
      data: { sessionId: "cs_test_qa0000000000000000unknown" },
    });
    expect(crossSite.status()).toBe(403);
    expect((await request.post("/api/checkout/cancel", { data: { sessionId: "cs_test_qa0000000000000000unknown" } })).status()).toBe(404);
    expect((await request.post("/api/checkout/cancel", { data: { sessionId: "pas-une-session" } })).status()).toBe(422);
  });
});
