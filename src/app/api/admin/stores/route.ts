import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { communityApiError, createAdminStore, listAdminStores } from "@/lib/community-service";
import { storeInputSchema } from "@/lib/community-validation";

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ stores: await listAdminStores() });
}

export async function POST(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = storeInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    return NextResponse.json({ store: await createAdminStore(parsed.data) }, { status: 201 });
  } catch (error) {
    const apiError = communityApiError(error, "Boutique introuvable.");
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
