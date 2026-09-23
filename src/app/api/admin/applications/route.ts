import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { listApplications } from "@/lib/community-service";
import { applicationStatusSchema } from "@/lib/community-validation";

export async function GET(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const status = applicationStatusSchema.shape.status.safeParse(new URL(request.url).searchParams.get("status"));
  return NextResponse.json({ applications: await listApplications(status.success ? status.data : undefined) });
}
