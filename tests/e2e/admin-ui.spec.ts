import type { Page } from "@playwright/test";
import { test, expect, collectProblems } from "../fixtures";
import { uniqueForwardedFor } from "../helpers/auth";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE_PATH } from "../helpers/env";
import { discoverPages } from "../helpers/pages";

// Interface d'administration (desktop uniquement : back-office non prévu pour mobile).

async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel(/e-?mail/i).and(page.locator("input")).fill(email);
  const passwordInput = page.getByLabel(/mot de passe/i).and(page.locator("input"));
  await passwordInput.fill(password);
  await passwordInput.press("Enter");
}

test.describe("Admin — interface", () => {
  test.skip(({ isMobile }) => isMobile, "back-office testé en desktop");

  test("sans session, /admin redirige vers la connexion avec callbackUrl", async ({ page }) => {
    await page.goto("/admin/produits");
    await expect(page).toHaveURL(/\/connexion-admin\?callbackUrl=%2Fadmin%2Fproduits/);
  });

  test("mauvais mot de passe → message d'erreur, reste sur la connexion", async ({ browser, baseURL }) => {
    // IP unique : l'échec ne compte pas dans le rate limit du compte admin partagé.
    const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": uniqueForwardedFor() } });
    const page = await context.newPage();
    try {
      await page.goto("/connexion-admin");
      await submitLogin(page, ADMIN_EMAIL, "mauvais-mot-de-passe-qa");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL(/\/connexion-admin/);
    } finally {
      await context.close();
    }
  });

  test("connexion réussie → /admin, puis déconnexion → /admin redemande la connexion", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": uniqueForwardedFor() } });
    const page = await context.newPage();
    try {
      await page.goto("/connexion-admin");
      await submitLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await page.getByRole("button", { name: /d[ée]connect|d[ée]connexion/i }).click();
      await expect(page).toHaveURL(/\/connexion-admin/);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/connexion-admin\?callbackUrl=%2Fadmin/);
    } finally {
      await context.close();
    }
  });

  test.describe("pages du back-office (session admin)", () => {
    test.use({ storageState: ADMIN_STATE_PATH });
    for (const url of discoverPages("admin").filter((candidate) => !candidate.includes("qa-id-inexistant"))) {
      test(`${url} s'affiche sans erreur`, async ({ page }) => {
        const problems = collectProblems(page);
        const response = await page.goto(url);
        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(new RegExp(`${url}$`));
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(problems.pageErrors).toEqual([]);
        expect(problems.consoleErrors).toEqual([]);
      });
    }
  });
});
