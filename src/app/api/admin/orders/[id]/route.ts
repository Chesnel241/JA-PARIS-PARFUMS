import { z } from "zod";
import { ApiError, handleApi, json, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { confirmOrderPayment, getAdminOrder, orderAmounts, orderProductSlugs, orderReference, setOrderStatus } from "@/lib/order-service";
import { revalidateOrders } from "@/lib/revalidate";
import { cancelOrderWithRefund } from "@/lib/stripe-checkout";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Commande introuvable." };

const orderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm-payment") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("set-status"), status: z.enum(["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"]) }),
], { error: "Action invalide." });

function withAmounts<T extends Parameters<typeof orderAmounts>[0] & { id: string; reference: string | null }>(order: T) {
  return { ...order, reference: orderReference(order), ...orderAmounts(order) };
}

export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/orders:get", async () => {
    await requireApiStaff();
    const order = await getAdminOrder(await parseId(params, messages.notFound));
    if (!order) throw new ApiError(404, messages.notFound);
    return json({ order: withAmounts(order) });
  }, messages);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/orders:action", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const action = await parseJson(request, orderActionSchema, { message: "Action invalide." });

    const order =
      action.action === "confirm-payment" ? await confirmOrderPayment(id)
      // Commande payée par carte : remboursement Stripe automatique avant annulation.
      : action.action === "cancel" ? await cancelOrderWithRefund(id)
      : await setOrderStatus(id, action.status);

    if (action.action === "cancel") {
      // Le stock restitué modifie la disponibilité affichée sur le site.
      revalidateOrders({ orderId: id, stockChanged: true, slugs: await orderProductSlugs(order.items) });
    } else {
      revalidateOrders({ orderId: id });
    }

    return json({ order: withAmounts(order) });
  }, messages);
}
