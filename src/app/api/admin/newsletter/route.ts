import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { listNewsletterSubscribers } from "@/lib/newsletter-service";

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ subscribers: await listNewsletterSubscribers() });
}
