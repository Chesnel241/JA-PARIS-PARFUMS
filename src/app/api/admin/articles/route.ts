import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { articleApiError, createAdminArticle, listAdminArticles } from "@/lib/article-service";
import { articleInputSchema } from "@/lib/article-validation";

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ articles: await listAdminArticles() });
}

export async function POST(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    const article = await createAdminArticle(parsed.data);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    const apiError = articleApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
