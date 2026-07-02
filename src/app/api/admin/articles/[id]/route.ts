import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { articleApiError, deleteAdminArticle, getAdminArticle, setAdminArticleStatus, updateAdminArticle } from "@/lib/article-service";
import { articleInputSchema, articleStatusSchema } from "@/lib/article-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const article = await getAdminArticle((await params).id);
  return article ? NextResponse.json({ article }) : NextResponse.json({ error: "Article introuvable." }, { status: 404 });
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides.", fields: parsed.error.flatten() }, { status: 422 });

  try {
    return NextResponse.json({ article: await updateAdminArticle((await params).id, parsed.data) });
  } catch (error) {
    const apiError = articleApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = articleStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 422 });

  try {
    return NextResponse.json({ article: await setAdminArticleStatus((await params).id, parsed.data.isPublished) });
  } catch (error) {
    const apiError = articleApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    await deleteAdminArticle((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const apiError = articleApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
