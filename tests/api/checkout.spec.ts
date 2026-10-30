import { test, expect } from "../fixtures";

// Paiement par carte (Stripe) — garde-fous publics, valables avec ou sans clé
// Stripe configurée (la CI tourne sans : repli Lydia). Les parcours signés
// sont décrits dans docs/API.md.

test.describe("API publique — paiement par carte", () => {
  test("webhook Stripe : un appel non signé n'est jamais traité", async ({ request }) => {
    const unsigned = await request.post("/api/stripe/webhook", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ type: "checkout.session.completed", data: { object: { metadata: { orderId: "x" }, payment_status: "paid" } } }),
    });
    // 400 (signature absente) si Stripe est configuré, 503 sinon.
    expect([400, 503]).toContain(unsigned.status());

    const forged = await request.post("/api/stripe/webhook", {
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
      data: "{}",
    });
    expect([400, 503]).toContain(forged.status());
  });

  test("statut de paiement : identifiant validé, session inconnue → 404", async ({ request }) => {
    const invalid = await request.get("/api/checkout/status?session_id=../../etc/passwd");
    expect(invalid.status()).toBe(422);
    const unknown = await request.get("/api/checkout/status?session_id=cs_test_qa0000000000000000unknown");
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).error).toBeTruthy();
  });

  test("annulation de paiement : origine étrangère refusée, session inconnue → 404", async ({ request }) => {
    const crossSite = await request.post("/api/checkout/cancel", {
      headers: { origin: "https://evil.example" },
      data: { sessionId: "cs_test_qa0000000000000000unknown" },
    });
    expect(crossSite.status()).toBe(403);
    const unknown = await request.post("/api/checkout/cancel", { data: { sessionId: "cs_test_qa0000000000000000unknown" } });
    expect(unknown.status()).toBe(404);
    const invalid = await request.post("/api/checkout/cancel", { data: { sessionId: "pas-une-session" } });
    expect(invalid.status()).toBe(422);
  });
});
