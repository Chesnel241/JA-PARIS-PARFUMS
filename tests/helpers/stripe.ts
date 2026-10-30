import Stripe from "stripe";
import { expect, type APIRequestContext } from "@playwright/test";

// Paiement par carte en test : le site parle à l'API Stripe simulée
// (tests/helpers/stripe-mock.mjs, voir docs/QA.md) via STRIPE_API_BASE.

export const STRIPE_MOCK_URL = (process.env.STRIPE_API_BASE ?? "http://127.0.0.1:12111").replace(/\/$/, "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export type CardCheckout = { method: "stripe"; url: string; sessionId: string; reference: string; amount: number; expiresAt: string };

export function hasWebhookSecret() {
  return WEBHOOK_SECRET.startsWith("whsec_");
}

/** Paiement accepté sur la page Stripe (simulée), sans suivre le retour vers le site. */
export async function payCheckout(request: APIRequestContext, sessionId: string) {
  const response = await request.get(`${STRIPE_MOCK_URL}/pay/${sessionId}/complete`, { maxRedirects: 0 });
  expect(response.status(), "paiement simulé").toBe(303);
}

/** Événement webhook signé avec le secret du serveur (comme le ferait Stripe). */
export function signedWebhook(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_qa_${Date.now()}`, object: "event", type, data: { object }, livemode: false, created: Math.floor(Date.now() / 1000) });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
}
