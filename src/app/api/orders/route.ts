import { NextResponse } from "next/server";
import { createOrder, orderApiError } from "@/lib/order-service";
import { orderInputSchema } from "@/lib/order-validation";

export async function POST(request: Request) {
  const parsed = orderInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const apiError = orderApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
