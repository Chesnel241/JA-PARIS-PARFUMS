import { test, expect } from "../fixtures";
import { findApplications, findSubscribers } from "../helpers/admin-api";
import { uniqueEmail } from "../helpers/factories";

// Formulaires publics : vérification de l'effet réel via l'API admin (pas seulement du message affiché).

test.describe("Formulaires publics", () => {
  test("candidature ambassadrice depuis /ambassadrices → enregistrée", async ({ page, adminRequest }) => {
    const email = uniqueEmail("candidature-ui");
    await page.goto("/ambassadrices");
    // La Lettre JAE (champ e-mail) est présente sur toutes les pages : on cible le formulaire de candidature.
    const form = page.getByRole("form", { name: /candidature/i });
    const field = (label: RegExp) => form.getByLabel(label).and(form.locator("input, textarea"));
    await field(/pr[ée]nom/i).fill("Léa");
    await field(/^nom/i).fill("Candidate");
    await field(/e-?mail/i).fill(email);
    await field(/message|motivation|pr[ée]sentez/i).fill("Je partage mes parfums préférés chaque semaine et j'aimerais représenter la maison JAE.");
    // Attestation d'âge (case obligatoire du formulaire du Cercle).
    await form.getByRole("checkbox", { name: /18 ans/i }).check();
    const sent = page.waitForResponse((response) => response.url().endsWith("/api/ambassador-applications") && response.request().method() === "POST");
    await form.getByRole("button", { name: /envoyer|candidat|postuler/i }).click();
    expect((await sent).status()).toBe(201);
    await expect(page.getByText(/merci|bien (été )?envoy|reçu/i).first()).toBeVisible();
    await expect.poll(async () => (await findApplications(adminRequest, email)).length).toBe(1);
  });

  test("inscription newsletter depuis l'accueil → enregistrée", async ({ page, adminRequest }) => {
    const email = uniqueEmail("newsletter-ui");
    await page.goto("/");
    const input = page.getByRole("textbox", { name: /e-?mail/i }).last();
    await input.scrollIntoViewIfNeeded();
    await input.fill(email);
    await input.press("Enter");
    await expect(page.getByText(/merci|inscrit/i).first()).toBeVisible();
    await expect.poll(async () => (await findSubscribers(adminRequest, email)).length, { timeout: 10_000 }).toBe(1);
  });
});
