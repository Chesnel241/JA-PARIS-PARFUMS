import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { communityApiError, deleteApplication, setApplicationStatus } from "@/lib/community-service";
import { applicationStatusSchema } from "@/lib/community-validation";

type RouteContext = { params: Promise<{ id: string }> };

function fail(error: unknown) {
  const apiError = communityApiError(error, "Candidature introuvable.");
  return NextResponse.json({ error: apiError.message }, { status: apiError.status });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = applicationStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 422 });

  try {
    return NextResponse.json({ application: await setApplicationStatus((await params).id, parsed.data.status) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    await deleteApplication((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return fail(error);
  }
}
