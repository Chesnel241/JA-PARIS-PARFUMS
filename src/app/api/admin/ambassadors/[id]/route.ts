import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { communityApiError, deleteAdminAmbassador, getAdminAmbassador, setAdminAmbassadorStatus, updateAdminAmbassador } from "@/lib/community-service";
import { activeStatusSchema, ambassadorInputSchema } from "@/lib/community-validation";

type RouteContext = { params: Promise<{ id: string }> };

function fail(error: unknown) {
  const apiError = communityApiError(error, "Ambassadrice introuvable.");
  return NextResponse.json({ error: apiError.message }, { status: apiError.status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const ambassador = await getAdminAmbassador((await params).id);
  return ambassador ? NextResponse.json({ ambassador }) : NextResponse.json({ error: "Ambassadrice introuvable." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = ambassadorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    return NextResponse.json({ ambassador: await updateAdminAmbassador((await params).id, parsed.data) });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = activeStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 422 });

  try {
    return NextResponse.json({ ambassador: await setAdminAmbassadorStatus((await params).id, parsed.data.isActive) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    await deleteAdminAmbassador((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}
