import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { deleteAdminProduct, getAdminProduct, productApiError, setAdminProductStatus, updateAdminProduct } from "@/lib/product-service";
import { productInputSchema, productStatusSchema } from "@/lib/product-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const product = await getAdminProduct((await params).id);
  return product ? NextResponse.json({ product }) : NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    return NextResponse.json({ product: await updateAdminProduct((await params).id, parsed.data) });
  } catch (error) {
    const apiError = productApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = productStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 422 });

  try {
    return NextResponse.json({ product: await setAdminProductStatus((await params).id, parsed.data.isActive) });
  } catch (error) {
    const apiError = productApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (staff.role !== Role.ADMIN) return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  try {
    await deleteAdminProduct((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const apiError = productApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
