import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/current-staff";
import { cancelOrder, confirmOrderPayment, orderApiError, setOrderStatus } from "@/lib/order-service";

type RouteContext = { params: Promise<{ id: string }> };

const orderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm-payment") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("set-status"), status: z.enum(["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"]) }),
]);

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const parsed = orderActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Action invalide." }, { status: 422 });

  const { id } = await params;
  try {
    const order =
      parsed.data.action === "confirm-payment" ? await confirmOrderPayment(id)
      : parsed.data.action === "cancel" ? await cancelOrder(id)
      : await setOrderStatus(id, parsed.data.status);
    return NextResponse.json({ order });
  } catch (error) {
    const apiError = orderApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
