import { test, expect } from "../fixtures";
import { articlePayload, createProduct, expectStatus, productPayload, removeProduct } from "../helpers/factories";

test.describe("Vitrine — navigation", () => {
  test("accueil sans erreur console ni pageerror", async ({ page, problems }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("load");
    expect(problems.pageErrors).toEqual([]);
    expect(problems.consoleErrors).toEqual([]);
  });

  test("navigation principale vers les parfums (menu mobile : ouverture/fermeture)", async ({ page, isMobile }) => {
    await page.goto("/");
    const header = page.getByRole("banner");

    if (isMobile) {
      // Le menu mobile est un dialogue plein écran rendu hors du <header>.
      const menu = page.getByRole("dialog", { name: /menu/i });
      await expect(menu).toHaveCount(0);
      await header.getByRole("button", { name: /ouvrir.*menu/i }).click();
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await header.getByRole("button", { name: /ouvrir.*menu/i }).click();
      await menu.getByRole("link", { name: /^parfums$/i }).click();
      await expect(menu, "le menu se referme après navigation").toHaveCount(0);
    } else {
      await header.getByRole("link", { name: /^parfums$/i }).click();
    }

    await expect(page).toHaveURL(/\/boutique$/);
    await expect(page.locator("h1")).toBeVisible();

    // L'icône panier ouvre le tiroir panier (dialogue) sans quitter la page.
    await header.getByRole("link", { name: /panier/i }).click();
    await expect(page.getByRole("dialog", { name: /panier/i })).toBeVisible();
    await expect(page).toHaveURL(/\/boutique$/);
  });

  test("/produit/slug-inexistant → page 404 (statut HTTP 404)", async ({ page }) => {
    const response = await page.goto("/produit/qa-slug-inexistant");
    await expect(page.getByText(/introuvable|n'existe pas|could not be found|404/i).first()).toBeVisible();
    expect(response?.status()).toBe(404);
  });
});

test.describe("Vitrine — recherche", () => {
  let product: { id: string; slug: string; name: string };

  test.beforeAll(async ({ adminRequest }) => {
    product = await createProduct(adminRequest, productPayload({ description: "Un accord qarecherche unique pour les tests de recherche." }));
  });
  test.afterAll(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  test("saisie dans le champ de recherche → résultat cliquable", async ({ page }) => {
    await page.goto("/recherche");
    await page.getByRole("searchbox", { name: /recherch/i }).fill(product.name);
    const result = page.getByRole("link", { name: new RegExp(product.name, "i") });
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(new RegExp(`/produit/${product.slug}$`));
  });

  test("/recherche?q=… affiche directement les résultats", async ({ page }) => {
    await page.goto(`/recherche?q=${encodeURIComponent(product.name)}`);
    await expect(page.getByRole("link", { name: new RegExp(product.name, "i") })).toBeVisible();
  });

  test("recherche sans résultat → message explicite", async ({ page }) => {
    await page.goto("/recherche");
    await page.getByRole("searchbox", { name: /recherch/i }).fill("zzqa-aucun-resultat");
    await expect(page.getByText(/aucun résultat/i).first()).toBeVisible();
  });
});

test.describe("Vitrine — Journal : contenu non exécuté (XSS)", () => {
  test("<script> et <img onerror> dans un article sont rendus comme du texte", async ({ page, adminRequest }) => {
    const payload = articlePayload({
      title: `Article XSS <img src=x onerror="window.__qaXss=1">`,
      content: `Avant <script>window.__qaXss = 2</script> milieu.\n\n<img src="x" onerror="window.__qaXss=3"> et <a href="javascript:window.__qaXss=4">lien</a>`,
    });
    const created = await adminRequest.post("/api/admin/articles", { data: payload });
    await expectStatus(created, 201);
    const { article } = (await created.json()) as { article: { id: string } };
    try {
      const dialogs: string[] = [];
      page.on("dialog", (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      await page.goto(`/journal/${payload.slug}`);
      await page.waitForLoadState("load");
      const main = page.locator("main");
      await expect(main).toContainText("<script>window.__qaXss = 2</script>");
      await expect(main).toContainText('<img src="x" onerror="window.__qaXss=3">');
      expect(await page.evaluate(() => (window as unknown as { __qaXss?: number }).__qaXss)).toBeUndefined();
      expect(await main.locator('img[src="x"], script:has-text("__qaXss"), a[href^="javascript:"]').count()).toBe(0);
      expect(dialogs).toEqual([]);
    } finally {
      await adminRequest.delete(`/api/admin/articles/${article.id}`);
    }
  });
});
