import { handleApi, json, parseJson } from "@/lib/api";
import { createOrder } from "@/lib/order-service";
import { orderInputSchema } from "@/lib/order-validation";
import { lydiaPaymentInstructions } from "@/lib/payment";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { revalidateOrders } from "@/lib/revalidate";

// Création d'une commande depuis le panier (public).
export async function POST(request: Request) {
  return handleApi("orders:create", async () => {
    // Validation d'abord (sans accès base) : une faute de saisie corrigée ne
    // consomme pas le quota du client ; seules les tentatives valides comptent.
    const input = await parseJson(request, orderInputSchema, { useFirstIssue: true, message: "Merci de vérifier les informations de votre commande." });
    await enforceRateLimit(request, RATE_LIMITS.orders, "Trop de commandes envoyées depuis cette connexion.");

    const order = await createOrder(input);
    revalidateOrders({ orderId: order.id, stockChanged: true });

    return json(
      {
        order: {
          ...order,
          subtotal: order.subtotalAmount,
          shippingAmount: order.shippingAmount,
          totalAmount: order.totalAmount,
        },
        payment: lydiaPaymentInstructions(order.reference, order.totalAmount),
      },
      { status: 201 },
    );
  });
}
