import type Stripe from "stripe";
import { json, jsonError } from "@/lib/api";
import { getStripe, isStripeEnabled, stripeWebhookSecret } from "@/lib/stripe";
import { describeStripeError, handleStripeEvent } from "@/lib/stripe-checkout";

// Webhook Stripe (Dashboard › Développeurs › Webhooks) :
//   https://jaeparis.com/api/stripe/webhook
// Événements : checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired.
//
// - Signature vérifiée sur le corps BRUT (STRIPE_WEBHOOK_SECRET) : un appel
//   non signé par Stripe est refusé (400) sans rien toucher.
// - Traitement idempotent : Stripe peut livrer un événement plusieurs fois.
// - Erreur de traitement → 500 : Stripe renvoie l'événement plus tard.

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 512 * 1024;

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret || !isStripeEnabled()) {
    console.error("[stripe:webhook] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET absente : événement refusé.");
    return jsonError(503, "Webhook Stripe non configuré.", {}, { "Retry-After": "300" });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "Signature Stripe manquante.");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PAYLOAD_BYTES) return jsonError(413, "Événement trop volumineux.");

  const payload = await request.text();
  if (payload.length > MAX_PAYLOAD_BYTES) return jsonError(413, "Événement trop volumineux.");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return jsonError(400, "Signature Stripe invalide.");
  }

  try {
    const result = await handleStripeEvent(event);
    return json({ received: true, result });
  } catch (error) {
    console.error(`[stripe:webhook] ${event.type} (${event.id}) non traité :`, describeStripeError(error));
    return jsonError(500, "Événement non traité, il sera renvoyé.");
  }
}
