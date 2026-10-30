import Stripe from "stripe";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import {
  attachCheckoutSession,
  cancelOrder,
  findOrderByCheckoutSession,
  listStaleCardOrders,
  markOrderRefunded,
  orderProductSlugs,
  recordCardPayment,
  releaseUnpaidOrder,
  touchOrder,
} from "@/lib/order-service";
import { prisma } from "@/lib/prisma";
import { revalidateOrders } from "@/lib/revalidate";
import { CHECKOUT_TTL_MINUTES, createCheckoutSession, getStripe, isStripeEnabled, type CheckoutOrder } from "@/lib/stripe";

// Cycle de vie d'une commande payée par carte :
//
//   commande créée (stock réservé, PENDING/UNPAID) ─▶ session Stripe Checkout
//     ├─ payée ───────────▶ CONFIRMED/PAID (webhook signé ou relecture au retour)
//     ├─ expirée/annulée ─▶ CANCELLED (stock restitué)
//     └─ paiement différé refusé ─▶ CANCELLED/FAILED (stock restitué)
//
// Toutes les transitions sont idempotentes : webhook, page de retour et
// filet de sécurité peuvent appliquer la même session sans double effet.

export type CheckoutState = "paid" | "processing" | "open" | "cancelled";

const PAYMENT_UNAVAILABLE = "Le paiement par carte est momentanément indisponible. Votre panier est conservé : réessayez dans un instant.";

// Journalisation sans donnée sensible (jamais de clé, jamais de carte).
export function describeStripeError(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return `${error.type}${error.code ? `/${error.code}` : ""}: ${error.message}${error.requestId ? ` (${error.requestId})` : ""}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function paymentIntentIdOf(session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;
  return typeof intent === "string" ? intent : intent?.id ?? null;
}

async function revalidateReleased(order: { id: string; items: { productId: string }[] }) {
  revalidateOrders({ orderId: order.id, stockChanged: true, slugs: await orderProductSlugs(order.items) });
}

async function refundPayment(paymentIntentId: string, orderId: string) {
  try {
    await getStripe().refunds.create(
      { payment_intent: paymentIntentId, metadata: { orderId } },
      { idempotencyKey: `refund-${orderId}` },
    );
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === "charge_already_refunded") return;
    console.error(`[stripe] remboursement de la commande ${orderId} impossible :`, describeStripeError(error));
    throw new ApiError(502, "Le remboursement Stripe a échoué : la commande n'a pas été modifiée. Réessayez, ou remboursez depuis le Dashboard Stripe.", { code: "REFUND_FAILED" });
  }
}

// ---------------------------------------------------------------------------
// 1. Démarrage du paiement
// ---------------------------------------------------------------------------

// Crée la session de paiement de la commande. En cas d'échec, la commande est
// annulée aussitôt (stock libéré) : elle ne serait de toute façon pas payable.
export async function startCardCheckout(order: CheckoutOrder) {
  let session: Stripe.Checkout.Session;
  try {
    session = await createCheckoutSession(order);
    if (!session.url) throw new Error("session sans URL de paiement");
  } catch (error) {
    console.error(`[stripe] session de paiement impossible pour ${order.reference} :`, describeStripeError(error));
    const released = await releaseUnpaidOrder(order.id).catch(() => null);
    if (released) await revalidateReleased(released);
    throw new ApiError(502, PAYMENT_UNAVAILABLE, { code: "PAYMENT_UNAVAILABLE" });
  }

  try {
    await attachCheckoutSession(order.id, session.id);
  } catch (error) {
    // Base indisponible juste après la création : on ferme la page de
    // paiement pour ne jamais encaisser une commande introuvable.
    console.error(`[stripe] session ${session.id} non enregistrée pour ${order.reference} :`, error);
    await getStripe().checkout.sessions.expire(session.id).catch(() => undefined);
    const released = await releaseUnpaidOrder(order.id).catch(() => null);
    if (released) await revalidateReleased(released);
    throw new ApiError(503, PAYMENT_UNAVAILABLE, { code: "PAYMENT_UNAVAILABLE" });
  }

  return { url: session.url, sessionId: session.id, expiresAt: new Date(session.expires_at * 1000).toISOString() };
}

// ---------------------------------------------------------------------------
// 2. Application de l'état d'une session (webhook, retour client, filet)
// ---------------------------------------------------------------------------

// `session` doit être authentique : reçue par un webhook dont la signature a
// été vérifiée, ou relue directement auprès de l'API Stripe.
export async function applyCheckoutSession(session: Stripe.Checkout.Session, options: { failed?: boolean } = {}) {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return "ignored" as const;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, stripeSessionId: true } });
  if (!order || (order.stripeSessionId && order.stripeSessionId !== session.id)) {
    console.warn(`[stripe] session ${session.id} sans commande correspondante (${orderId}) : ignorée.`);
    return "ignored" as const;
  }

  if (session.payment_status === "paid") {
    const paymentIntentId = paymentIntentIdOf(session);
    const { order: updated, outcome } = await recordCardPayment(order.id, { sessionId: session.id, paymentIntentId });
    if (outcome === "cancelled" && paymentIntentId && updated.paymentStatus !== PaymentStatus.REFUNDED) {
      // Paiement reçu pour une commande déjà annulée (stock possiblement
      // revendu) : le client est remboursé intégralement.
      console.warn(`[stripe] paiement reçu après annulation de ${updated.reference ?? order.id} : remboursement.`);
      await refundPayment(paymentIntentId, order.id);
      await markOrderRefunded(order.id);
    }
    revalidateOrders({ orderId: order.id });
    return outcome;
  }

  if (session.status === "expired" || options.failed) {
    const released = await releaseUnpaidOrder(order.id, { failed: options.failed });
    if (released) await revalidateReleased(released);
    return released ? ("released" as const) : ("unchanged" as const);
  }

  return "unchanged" as const;
}

// Événements webhook pris en compte (à sélectionner dans le Dashboard).
export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      return applyCheckoutSession(event.data.object);
    case "checkout.session.async_payment_failed":
      return applyCheckoutSession(event.data.object, { failed: true });
    default:
      return "ignored" as const;
  }
}

// ---------------------------------------------------------------------------
// 3. Retour du client (page de confirmation / annulation)
// ---------------------------------------------------------------------------

type CardOrder = NonNullable<Awaited<ReturnType<typeof findOrderByCheckoutSession>>>;

function stateOf(order: CardOrder): CheckoutState | "pending" {
  if (order.status === OrderStatus.CANCELLED) return "cancelled";
  if (order.paymentStatus === PaymentStatus.PAID) return "paid";
  return "pending";
}

// Récapitulatif renvoyé au porteur de l'identifiant de session (secret de
// l'URL de retour Stripe) : rien de plus que ce qu'affiche la confirmation.
function publicOrder(order: CardOrder) {
  const address = (order.deliveryAddress ?? {}) as { firstName?: unknown };
  return {
    reference: order.reference ?? "",
    email: order.email,
    firstName: typeof address.firstName === "string" ? address.firstName : "",
    subtotal: order.subtotalAmount,
    shippingAmount: order.shippingAmount,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(({ name, volume, quantity, price }) => ({ name, volume, quantity, price })),
  };
}

async function loadCardOrder(sessionId: string) {
  const order = await findOrderByCheckoutSession(sessionId);
  if (!order) throw new ApiError(404, "Paiement introuvable.", { code: "SESSION_NOT_FOUND" });
  return order;
}

export async function getCheckoutStatus(sessionId: string) {
  let order = await loadCardOrder(sessionId);
  let state = stateOf(order);
  let paymentUrl: string | null = null;

  if (state === "pending" && isStripeEnabled()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      await applyCheckoutSession(session);
      order = await loadCardOrder(sessionId);
      state = stateOf(order);
      if (state === "pending" && session.status === "open") {
        paymentUrl = session.url;
        return { state: "open" as CheckoutState, paymentUrl, order: publicOrder(order) };
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error(`[stripe] relecture de la session ${sessionId} impossible :`, describeStripeError(error));
    }
  }

  // Paiement différé (virement, prélèvement) ou Stripe momentanément injoignable.
  return { state: (state === "pending" ? "processing" : state) as CheckoutState, paymentUrl, order: publicOrder(order) };
}

// Le client a quitté la page de paiement : on ferme la session (plus aucun
// paiement possible) puis on libère le stock. Si le paiement a abouti
// entre-temps, il est enregistré au lieu d'être annulé.
export async function cancelCardCheckout(sessionId: string) {
  const order = await loadCardOrder(sessionId);
  const current = stateOf(order);
  if (current !== "pending") return current;
  if (!isStripeEnabled()) throw new ApiError(503, PAYMENT_UNAVAILABLE, { code: "PAYMENT_UNAVAILABLE" });

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.expire(sessionId);
  } catch {
    // Déjà expirée ou terminée : on applique son état réel.
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error(`[stripe] annulation de la session ${sessionId} impossible :`, describeStripeError(error));
      throw new ApiError(502, PAYMENT_UNAVAILABLE, { code: "PAYMENT_UNAVAILABLE" });
    }
  }
  await applyCheckoutSession(session);
  const state = stateOf(await loadCardOrder(sessionId));
  return state === "pending" ? "processing" : state;
}

// ---------------------------------------------------------------------------
// 4. Annulation admin (avec remboursement automatique)
// ---------------------------------------------------------------------------

export async function cancelOrderWithRefund(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, paymentStatus: true, stripeSessionId: true, stripePaymentIntentId: true },
  });
  if (!order) throw new ApiError(404, "Commande introuvable.");
  const actionable = order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.DELIVERED;

  if (actionable && order.stripeSessionId) {
    if (!isStripeEnabled()) {
      if (order.paymentStatus === PaymentStatus.PAID && order.stripePaymentIntentId) {
        throw new ApiError(503, "Remboursement impossible : la clé Stripe n'est pas configurée. Remboursez depuis le Dashboard Stripe, puis réessayez.", { code: "STRIPE_DISABLED" });
      }
    } else if (order.paymentStatus === PaymentStatus.UNPAID) {
      // Ferme d'abord la page de paiement : aucun paiement après l'annulation.
      await cancelCardCheckout(order.stripeSessionId);
    }

    const fresh = await prisma.order.findUniqueOrThrow({ where: { id }, select: { status: true, paymentStatus: true, stripePaymentIntentId: true } });
    if (isStripeEnabled() && fresh.status !== OrderStatus.CANCELLED && fresh.paymentStatus === PaymentStatus.PAID && fresh.stripePaymentIntentId) {
      await refundPayment(fresh.stripePaymentIntentId, id);
    }
  }

  return cancelOrder(id);
}

// ---------------------------------------------------------------------------
// 5. Filet de sécurité (webhook manqué ou non configuré)
// ---------------------------------------------------------------------------

export async function sweepStaleCheckouts(limit = 5) {
  if (!isStripeEnabled()) return;
  try {
    const cutoff = new Date(Date.now() - (CHECKOUT_TTL_MINUTES + 5) * 60_000);
    const stale = await listStaleCardOrders(cutoff, limit);
    for (const order of stale) {
      if (!order.stripeSessionId) continue;
      try {
        const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
        const result = await applyCheckoutSession(session);
        if (result === "unchanged") await touchOrder(order.id);
      } catch (error) {
        console.error(`[stripe] resynchronisation de la commande ${order.id} impossible :`, describeStripeError(error));
      }
    }
  } catch (error) {
    console.error("[stripe] filet de sécurité indisponible :", error);
  }
}
