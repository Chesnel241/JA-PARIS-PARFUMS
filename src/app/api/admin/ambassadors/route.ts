import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { communityApiError, createAdminAmbassador, listAdminAmbassadors } from "@/lib/community-service";
import { ambassadorInputSchema } from "@/lib/community-validation";

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ ambassadors: await listAdminAmbassadors() });
}

export async function POST(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = ambassadorInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    return NextResponse.json({ ambassador: await createAdminAmbassador(parsed.data) }, { status: 201 });
  } catch (error) {
    const apiError = communityApiError(error, "Ambassadrice introuvable.");
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
