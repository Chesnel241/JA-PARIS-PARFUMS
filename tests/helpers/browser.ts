import { expect, type Page } from "@playwright/test";

/** Défile toute la page par paliers (déclenche lazy-loading et animations « whileInView »). */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
    }
    window.scrollTo(0, 0);
  });
}

/** Vérifie que chaque image visible est chargée et décodée (naturalWidth > 0). */
export async function expectVisibleImagesLoaded(page: Page) {
  const images = page.locator("img");
  const count = await images.count();
  const broken: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded().catch(() => undefined);
    const loaded = await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 10_000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);
    if (!loaded) broken.push((await image.getAttribute("src")) ?? "<sans src>");
  }
  expect(broken, `images non chargées : ${broken.join(", ")}`).toEqual([]);
}

/** Pas de défilement horizontal : largeur du document <= largeur du viewport (+1 px d'arrondi). */
export async function expectNoHorizontalOverflow(page: Page) {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(metrics.scrollWidth, `débordement horizontal (viewport ${viewportWidth}px, innerWidth ${metrics.innerWidth}px)`).toBeLessThanOrEqual(
    Math.min(viewportWidth, metrics.innerWidth) + 1,
  );
}

/** Lien de paiement externe : on ne sort jamais vers Lydia pendant les tests. */
export async function stubExternalPayment(page: Page) {
  await page.route(/^https:\/\/(pay\.)?lydia(-app)?\.(me|com)\//, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: '<!doctype html><html lang="fr"><title>Lydia (stub QA)</title><h1>Paiement</h1></html>' }),
  );
}
