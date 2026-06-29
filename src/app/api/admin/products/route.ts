import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { createAdminProduct, listAdminProducts, productApiError } from "@/lib/product-service";
import { productInputSchema } from "@/lib/product-validation";

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ products: await listAdminProducts() });
}

export async function POST(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    const product = await createAdminProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const apiError = productApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
