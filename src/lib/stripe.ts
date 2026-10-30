import Stripe from "stripe";
import { getSiteUrl } from "@/lib/env";

// Paiement par carte bancaire avec Stripe Checkout (page de paiement hébergée
// par Stripe : aucune donnée bancaire ne transite par le site).
//
// - Seul moyen de paiement : sans STRIPE_SECRET_KEY, les commandes sont
//   refusées (503) et rien n'est réservé.
// - Montants TTC issus EXCLUSIVEMENT de la base (jamais du navigateur).
// - Moyens de paiement dynamiques : réglés dans le Dashboard Stripe (on ne
//   passe jamais `payment_method_types`).
// - Stripe Tax : opt-in (STRIPE_AUTOMATIC_TAX=true) une fois l'adresse du
//   siège et les immatriculations renseignées dans Dashboard › Tax.

// Version d'API figée : une mise à jour du SDK ne change pas le comportement.
export const STRIPE_API_VERSION = "2026-10-28.endive";

// Étiquette des sessions (Dashboard › Checkout) pour suivre ce parcours.
const INTEGRATION_IDENTIFIER = "jaeparis-panier-hxqmtwrd";

// Durée de réservation du stock pendant le paiement (Stripe : 30 min minimum).
export const CHECKOUT_TTL_MINUTES = 35;

const SECRET_KEY_PATTERN = /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/;
const TAX_CODE_PATTERN = /^txcd_\d{8}$/;
export const CHECKOUT_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function isStripeEnabled() {
  return SECRET_KEY_PATTERN.test(stripeSecretKey());
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  return secret.startsWith("whsec_") ? secret : "";
}

export function isAutomaticTaxEnabled() {
  return process.env.STRIPE_AUTOMATIC_TAX?.trim().toLowerCase() === "true";
}

// Code taxe produit facultatif (sinon : code par défaut du compte, réglé dans
// Dashboard › Tax › Settings). Jamais inventé : valeur fournie par l'exploitant.
function productTaxCode() {
  const code = process.env.STRIPE_TAX_CODE?.trim();
  return code && TAX_CODE_PATTERN.test(code) ? code : undefined;
}

// Tests (CI, local) : API Stripe simulée (tests/helpers/stripe-mock.mjs).
// Honoré UNIQUEMENT avec une clé de test : une clé live ne part jamais
// ailleurs que vers api.stripe.com.
function apiBaseOverride(key: string): { host: string; port: number; protocol: "http" | "https" } | Record<string, never> {
  const base = process.env.STRIPE_API_BASE?.trim();
  if (!base || !/^(sk|rk)_test_/.test(key)) return {};
  try {
    const url = new URL(base);
    const protocol = url.protocol === "http:" ? "http" : "https";
    return { host: url.hostname, port: Number(url.port) || (protocol === "http" ? 80 : 443), protocol };
  } catch {
    return {};
  }
}

let cached: { key: string; client: Stripe } | null = null;

// Client instancié à la demande : jamais pendant `next build` ni sans clé.
export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!SECRET_KEY_PATTERN.test(key)) throw new Error("STRIPE_SECRET_KEY absente ou invalide.");
  if (cached?.key !== key) {
    cached = {
      key,
      client: new Stripe(key, {
        apiVersion: STRIPE_API_VERSION,
        maxNetworkRetries: 2,
        timeout: 15_000,
        appInfo: { name: "JAE Paris", url: "https://jaeparis.com" },
        ...apiBaseOverride(key),
      }),
    };
  }
  return cached.client;
}

// URL du Dashboard pour un paiement (lien depuis l'admin).
export function dashboardPaymentUrl(paymentIntentId: string) {
  const test = /^(sk|rk)_test_/.test(stripeSecretKey());
  return `https://dashboard.stripe.com/${test ? "test/" : ""}payments/${encodeURIComponent(paymentIntentId)}`;
}

// ---------------------------------------------------------------------------
// Création de la session de paiement
// ---------------------------------------------------------------------------

// Pays proposés au panier → code ISO (adresse transmise à Stripe pour
// l'analyse anti-fraude Radar et le Dashboard).
const COUNTRY_CODES: Record<string, string> = {
  france: "FR",
  fr: "FR",
  "france métropolitaine": "FR",
  "france metropolitaine": "FR",
  belgique: "BE",
  luxembourg: "LU",
  monaco: "MC",
  suisse: "CH",
  allemagne: "DE",
  espagne: "ES",
  italie: "IT",
  "pays-bas": "NL",
  portugal: "PT",
  "royaume-uni": "GB",
};

type DeliveryAddress = {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
};

export type CheckoutOrder = {
  id: string;
  reference: string;
  email: string;
  shippingAmount: number;
  items: { name: string; volume: string; quantity: number; price: number }[];
  deliveryAddress: unknown;
};

function shippingDetails(raw: unknown): Stripe.Checkout.SessionCreateParams.PaymentIntentData.Shipping | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const address = raw as DeliveryAddress;
  const country = COUNTRY_CODES[address.country?.trim().toLowerCase() ?? ""];
  const name = [address.firstName, address.lastName].filter(Boolean).join(" ").trim();
  if (!country || !name || !address.address || !address.city || !address.postalCode) return undefined;
  return {
    name,
    ...(address.phone ? { phone: address.phone } : {}),
    address: { line1: address.address, city: address.city, postal_code: address.postalCode, country },
  };
}

export async function createCheckoutSession(order: CheckoutOrder) {
  const site = getSiteUrl();
  const taxCode = productTaxCode();
  const metadata = { orderId: order.id, reference: order.reference };
  const shipping = shippingDetails(order.deliveryAddress);

  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      locale: "fr",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata,
      payment_intent_data: {
        description: `Commande ${order.reference} · JAE Paris`,
        metadata,
        ...(shipping ? { shipping } : {}),
      },
      // Prix TTC : la TVA éventuelle est incluse, jamais ajoutée au total.
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "eur",
          unit_amount: item.price,
          tax_behavior: "inclusive",
          product_data: { name: `${item.name} · ${item.volume}`, ...(taxCode ? { tax_code: taxCode } : {}) },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: order.shippingAmount > 0 ? "Livraison suivie" : "Livraison offerte",
            fixed_amount: { amount: order.shippingAmount, currency: "eur" },
            tax_behavior: "inclusive",
          },
        },
      ],
      automatic_tax: { enabled: isAutomaticTaxEnabled() },
      submit_type: "pay",
      custom_text: { submit: { message: `Commande ${order.reference} · le stock vous est réservé ${CHECKOUT_TTL_MINUTES} minutes.` } },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_MINUTES * 60,
      success_url: `${site}/panier?etape=confirmation&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/panier?etape=livraison&paiement=annule`,
      integration_identifier: INTEGRATION_IDENTIFIER,
    },
    { idempotencyKey: `checkout-session-${order.id}` },
  );
}
