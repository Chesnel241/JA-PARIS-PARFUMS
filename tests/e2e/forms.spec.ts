import { test, expect } from "../fixtures";
import { findApplications, findSubscribers } from "../helpers/admin-api";
import { uniqueEmail } from "../helpers/factories";

// Formulaires publics : vérification de l'effet réel via l'API admin (pas seulement du message affiché).

test.describe("Formulaires publics", () => {
  // BUG: /ambassadrices ne contient aucun formulaire de candidature (src/app/(site)/ambassadrices/page.tsx) :
  // l'API POST /api/ambassador-applications existe mais n'est reliée à aucune UI.
  test("candidature ambassadrice depuis /ambassadrices → enregistrée", async ({ page, adminRequest }) => {
    const email = uniqueEmail("candidature-ui");
    await page.goto("/ambassadrices");
    const field = (label: RegExp) => page.getByLabel(label).and(page.locator("input, textarea"));
    await field(/pr[ée]nom/i).fill("Léa");
    await field(/^nom/i).fill("Candidate");
    await field(/e-?mail/i).fill(email);
    await field(/message|motivation|pr[ée]sentez/i).fill("Je partage mes parfums préférés chaque semaine et j'aimerais représenter la maison JAE.");
    const sent = page.waitForResponse((response) => response.url().endsWith("/api/ambassador-applications") && response.request().method() === "POST");
    await page.getByRole("button", { name: /envoyer|candidat|postuler/i }).click();
    expect((await sent).status()).toBe(201);
    await expect(page.getByText(/merci|bien (été )?envoy|reçu/i).first()).toBeVisible();
    await expect.poll(async () => (await findApplications(adminRequest, email)).length).toBe(1);
  });

  // BUG: le formulaire newsletter de l'accueil (src/app/(site)/home-content.tsx) vide le champ et affiche
  // « Merci » sans jamais appeler POST /api/newsletter : aucune inscription n'est enregistrée.
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
