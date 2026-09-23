import { test, expect } from "../fixtures";
import { expectNoHorizontalOverflow, expectVisibleImagesLoaded, scrollThrough } from "../helpers/browser";
import { PUBLIC_PAGES, resolvePublicPath } from "../helpers/pages";

// Qualité & responsive de chaque page publique (liste centralisée dans helpers/pages.ts),
// exécuté dans les projets desktop (1440 px) et mobile (390 px).

for (const publicPage of PUBLIC_PAGES) {
  test.describe(`Qualité — ${publicPage.name} (${publicPage.path})`, () => {
    test("structure : <html lang=fr>, <title> non vide, un seul h1", async ({ page, request }) => {
      const response = await page.goto(await resolvePublicPath(request, publicPage));
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      expect((await page.title()).trim()).not.toBe("");
      await expect(page.locator("h1"), "exactement un h1 attendu").toHaveCount(1);
    });

    test("aucune erreur console ni pageerror, aucune ressource en échec", async ({ page, request, problems }) => {
      await page.goto(await resolvePublicPath(request, publicPage));
      await page.waitForLoadState("load");
      await scrollThrough(page);
      await page.waitForLoadState("load");
      expect(problems.pageErrors, "pageerror").toEqual([]);
      expect(problems.consoleErrors, "console.error").toEqual([]);
      expect(problems.failedResponses, "réponses >= 400").toEqual([]);
    });

    test("pas de débordement horizontal", async ({ page, request }) => {
      await page.goto(await resolvePublicPath(request, publicPage));
      await page.waitForLoadState("load");
      await expectNoHorizontalOverflow(page);
      await scrollThrough(page);
      await expectNoHorizontalOverflow(page);
    });

    test("toutes les images visibles sont chargées", async ({ page, request }) => {
      await page.goto(await resolvePublicPath(request, publicPage));
      await page.waitForLoadState("load");
      await expectVisibleImagesLoaded(page);
    });
  });
}
