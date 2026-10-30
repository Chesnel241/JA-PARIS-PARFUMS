import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { createProduct, priceRegExp, productPayload, removeProduct, uniqueEmail, variantStock, type AdminProduct, type CreatedOrder } from "../helpers/factories";
import type { CardCheckout } from "../helpers/stripe";

// Parcours client complet dans le navigateur (desktop + mobile), sur un produit
// créé pour le test (prix 25 € → total 25 + 5,90 = 30,90 €). Le paiement passe
// par la page Stripe simulée (tests/helpers/stripe-mock.mjs).

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

/** Produit → panier → livraison → redirection vers la page de paiement Stripe. */
async function checkoutToPaymentPage(page: Page, product: AdminProduct) {
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
  // La page quitte le site aussitôt la réponse reçue : on la capture au passage.
  let created: { status: number; body: { order: CreatedOrder; payment: CardCheckout } } | null = null;
  await page.route("**/api/orders", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    created = { status: response.status(), body: JSON.parse(body) };
    await route.fulfill({ response, body });
  });
  await page.getByRole("button", { name: /payer par carte/i }).click();
  await page.waitForURL(/\/pay\/cs_test_/);
  const result = created as { status: number; body: { order: CreatedOrder; payment: CardCheckout } } | null;
  expect(result?.status).toBe(201);
  const { order, payment } = result!.body;
  expect(payment.method).toBe("stripe");
  expect(page.url()).toBe(payment.url);
  return { order, payment, email };
}

test.describe("Parcours d'achat (carte bancaire)", () => {
  let product: AdminProduct;

  test.beforeEach(async ({ adminRequest }) => {
    product = await createProduct(adminRequest, productPayload({ variants: [{ volume: "50 ml", price: PRICE, stock: 20 }] }));
  });
  test.afterEach(async ({ adminRequest }) => {
    if (product) await removeProduct(adminRequest, product.id);
  });

  test("fiche produit → panier → livraison → paiement Stripe → confirmation, stock décrémenté", async ({ page, adminRequest }) => {
    const { order, email } = await checkoutToPaymentPage(page, product);
    expect(order.email).toBe(email);
    expect(order.totalAmount).toBe(TOTAL);
    expect(await variantStock(adminRequest, product.id, "50 ml"), "stock réservé pendant le paiement").toBe(19);

    await page.getByRole("link", { name: /^payer/i }).click();
    await page.waitForURL(/\/panier\?etape=confirmation&session_id=cs_/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/merci/i);
    const confirmation = page.locator("main");
    await expect(confirmation).toContainText("Paiement confirmé");
    expect(order.reference).toMatch(/^JAE-/);
    await expect(confirmation).toContainText(order.reference as string);
    await expect(confirmation).toContainText(priceRegExp(TOTAL));
    expect(await variantStock(adminRequest, product.id, "50 ml")).toBe(19);

    // Panier vidé une fois le paiement confirmé.
    await page.goto("/panier");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/panier attend/i);
  });

  test("retour depuis la page de paiement : commande annulée, stock restitué, panier conservé", async ({ page, adminRequest }) => {
    const { order } = await checkoutToPaymentPage(page, product);
    await page.getByRole("link", { name: /^retour/i }).click();
    await page.waitForURL(/\/panier/);
    await expect(page.getByText(new RegExp(`commande ${order.reference} a été annulée`))).toBeVisible();
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect.poll(() => variantStock(adminRequest, product.id, "50 ml"), { message: "stock restitué après abandon" }).toBe(20);
  });
});
