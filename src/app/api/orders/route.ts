import { after } from "next/server";
import { handleApi, json, parseJson } from "@/lib/api";
import { createOrder } from "@/lib/order-service";
import { orderInputSchema } from "@/lib/order-validation";
import { lydiaPaymentInstructions, type PaymentInstructions } from "@/lib/payment";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { revalidateOrders } from "@/lib/revalidate";
import { isStripeEnabled } from "@/lib/stripe";
import { startCardCheckout, sweepStaleCheckouts } from "@/lib/stripe-checkout";

// Création d'une commande depuis le panier (public). Avec Stripe, la réponse
// contient l'URL de la page de paiement sécurisée vers laquelle rediriger.
export async function POST(request: Request) {
  return handleApi("orders:create", async () => {
    // Validation d'abord (sans accès base) : une faute de saisie corrigée ne
    // consomme pas le quota du client ; seules les tentatives valides comptent.
    const input = await parseJson(request, orderInputSchema, { useFirstIssue: true, message: "Merci de vérifier les informations de votre commande." });
    await enforceRateLimit(request, RATE_LIMITS.orders, "Trop de commandes envoyées depuis cette connexion.");

    const order = await createOrder(input);
    revalidateOrders({ orderId: order.id, stockChanged: true });

    let payment: PaymentInstructions;
    if (isStripeEnabled()) {
      const checkout = await startCardCheckout(order);
      payment = { method: "stripe", url: checkout.url, sessionId: checkout.sessionId, reference: order.reference, amount: order.totalAmount, expiresAt: checkout.expiresAt };
      // Libère, après la réponse, le stock des paiements abandonnés dont le
      // webhook ne serait pas parvenu.
      after(() => sweepStaleCheckouts());
    } else {
      payment = lydiaPaymentInstructions(order.reference, order.totalAmount);
    }

    return json(
      {
        order: {
          ...order,
          subtotal: order.subtotalAmount,
          shippingAmount: order.shippingAmount,
          totalAmount: order.totalAmount,
        },
        payment,
      },
      { status: 201 },
    );
  });
}
