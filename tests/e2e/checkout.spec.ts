import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { stubExternalPayment } from "../helpers/browser";
import { createProduct, priceRegExp, productPayload, removeProduct, uniqueEmail, variantStock, type AdminProduct, type CreatedOrder } from "../helpers/factories";

// Parcours client complet dans le navigateur (desktop + mobile), sur un produit
// créé pour le test (prix 25 € → total 25 + 5,90 = 30,90 €).

const PRICE = 2500;
const TOTAL = PRICE + 590;

/** Remplit le formulaire de livraison par libellés accessibles (point unique à adapter si l'UI change). */
async function fillCheckoutForm(page: Page, email: string) {
  const field = (label: RegExp) => page.getByLabel(label).and(page.locator("input, select, textarea"));
  await field(/e-?mail/i).fill(email);
  await field(/pr[ée]nom/i).fill("Camille");
  await field(/^nom/i).fill("Testeuse");
  await field(/^adresse(?!.*mail)/i).fill("1 rue de la Qualité");
  await field(/code postal/i).fill("75001");
  await field(/ville/i).fill("Paris");
  const country = field(/pays/i);
  if ((await country.count()) > 0 && (await country.inputValue()) === "") await country.fill("France");
}

async function addProductToCartAndCheckout(page: Page, product: AdminProduct) {
  await page.goto(`/produit/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
  await page.getByRole("button", { name: /ajouter au panier/i }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: /panier/i })).toHaveAccessibleName(/1/);

  await page.goto("/panier");
  await expect(page.getByText(product.name).first()).toBeVisible();
  // Le panier survit à un rechargement (persistance locale).
  await page.reload();
  await expect(page.getByText(product.name).first()).toBeVisible();
  await expect(page.getByText(priceRegExp(TOTAL)).first()).toBeVisible();

  await page.getByRole("button", { name: /continuer|commander|valider|passer/i }).first().click();
  const email = uniqueEmail("parcours");
  await fillCheckoutForm(page, email);
  const orderResponse = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
  await page.getByRole("button", { name: /valider la commande|commander|payer|confirmer/i }).last().click();
  const response = await orderResponse;
  expect(response.status()).toBe(201);
  const { order } = (await response.json()) as { order: CreatedOrder };
  return { order, email };
}

test.describe("Parcours d'achat", () => {
  let product: AdminProduct;

  test.beforeEach(async ({ adminRequest, page }) => {
    await stubExternalPayment(page);
    product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: PRICE, stock: 20 }] }));
  });
  test.afterEach(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  test("fiche produit → panier (persistant) → livraison → commande enregistrée, stock décrémenté", async ({ page, adminRequest }) => {
    const { order, email } = await addProductToCartAndCheckout(page, product);
    expect(order.email).toBe(email);
    expect(order.totalAmount).toBe(TOTAL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/commande|merci/i);
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(19);
  });

  test("la confirmation affiche la référence de commande et le bon total", async ({ page }) => {
    const { order } = await addProductToCartAndCheckout(page, product);
    const confirmation = page.locator("main");
    // Référence lisible (JAE-XXXXXX) renvoyée par l'API, à reporter dans le message Lydia.
    expect(order.reference).toMatch(/^JAE-/);
    await expect(confirmation).toContainText(order.reference as string);
    await expect(confirmation).toContainText(priceRegExp(TOTAL));
  });
});
