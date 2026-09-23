import { OrderStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { handleApi, json, parseQuery, requireApiStaff } from "@/lib/api";
import { listAdminOrders, orderAmounts, orderReference } from "@/lib/order-service";

const querySchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]).optional(),
  paymentStatus: z.enum(Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]]).optional(),
});

// Liste des commandes (filtres optionnels ?status=…&paymentStatus=…).
export async function GET(request: Request) {
  return handleApi("admin/orders:list", async () => {
    await requireApiStaff();
    const { status, paymentStatus } = parseQuery(request, querySchema);
    const where: Prisma.OrderWhereInput = { ...(status ? { status } : {}), ...(paymentStatus ? { paymentStatus } : {}) };
    const orders = await listAdminOrders(where);
    return json({ orders: orders.map((order) => ({ ...order, reference: orderReference(order), ...orderAmounts(order) })) });
  });
}
