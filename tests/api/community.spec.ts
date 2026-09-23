import { test, expect } from "../fixtures";
import { findApplications, findSubscribers } from "../helpers/admin-api";
import { applicationPayload, expectStatus, uniqueEmail } from "../helpers/factories";

test.describe("API publique — candidature ambassadrice", () => {
  test("candidature valide → 201 et enregistrée (statut NEW)", async ({ request, adminRequest }) => {
    const payload = applicationPayload();
    await expectStatus(await request.post("/api/ambassador-applications", { data: payload }), 201);
    const stored = await findApplications(adminRequest, payload.email);
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe("NEW");
    await adminRequest.delete(`/api/admin/applications/${stored[0].id}`);
  });

  test("message trop court → 422, rien d'enregistré", async ({ request, adminRequest }) => {
    const payload = applicationPayload({ message: "Trop court." });
    await expectStatus(await request.post("/api/ambassador-applications", { data: payload }), 422);
    expect(await findApplications(adminRequest, payload.email)).toHaveLength(0);
  });

  test("email invalide ou JSON cassé → 422", async ({ request }) => {
    await expectStatus(await request.post("/api/ambassador-applications", { data: applicationPayload({ email: "pas-un-email" }) }), 422);
    await expectStatus(
      await request.post("/api/ambassador-applications", { data: "{", headers: { "content-type": "application/json" } }),
      422,
    );
  });

  test("pot de miel `website` rempli → 201 mais rien en base", async ({ request, adminRequest }) => {
    const payload = applicationPayload({ website: "https://spam.example.com" });
    await expectStatus(await request.post("/api/ambassador-applications", { data: payload }), 201);
    expect(await findApplications(adminRequest, payload.email)).toHaveLength(0);
  });
});

test.describe("API publique — newsletter", () => {
  test("inscription → 201, idempotente (une seule entrée), email normalisé", async ({ request, adminRequest }) => {
    const email = uniqueEmail("newsletter");
    await expectStatus(await request.post("/api/newsletter", { data: { email } }), 201);
    await expectStatus(await request.post("/api/newsletter", { data: { email: `  ${email.toUpperCase()} ` } }), 201);
    expect(await findSubscribers(adminRequest, email)).toHaveLength(1);
  });

  test("email invalide → 422", async ({ request }) => {
    for (const email of ["", "pas-un-email", "a@b", `${"x".repeat(200)}@example.com`]) {
      await expectStatus(await request.post("/api/newsletter", { data: { email } }), 422, `email « ${email.slice(0, 20)} »`);
    }
    await expectStatus(await request.post("/api/newsletter", { data: "{", headers: { "content-type": "application/json" } }), 422, "JSON cassé");
  });

  test("pot de miel rempli → 201 mais rien en base", async ({ request, adminRequest }) => {
    const email = uniqueEmail("newsletter-bot");
    await expectStatus(await request.post("/api/newsletter", { data: { email, website: "http://spam.example.com" } }), 201);
    expect(await findSubscribers(adminRequest, email)).toHaveLength(0);
  });
});
