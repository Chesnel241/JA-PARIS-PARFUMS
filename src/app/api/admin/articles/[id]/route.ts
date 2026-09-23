import { ApiError, handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { deleteAdminArticle, getAdminArticle, setAdminArticleStatus, updateAdminArticle } from "@/lib/article-service";
import { articleInputSchema, articleStatusSchema } from "@/lib/article-validation";
import { revalidateJournal } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Article introuvable.", conflict: "Un article utilise déjà ce slug." };

async function requireArticle(id: string) {
  const article = await getAdminArticle(id);
  if (!article) throw new ApiError(404, messages.notFound);
  return article;
}

export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/articles:get", async () => {
    await requireApiStaff();
    return json({ article: await requireArticle(await parseId(params, messages.notFound)) });
  }, messages);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handleApi("admin/articles:update", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const input = await parseJson(request, articleInputSchema);
    const previous = await requireArticle(id);
    const article = await updateAdminArticle(id, input);
    revalidateJournal({ slugs: [previous.slug, article.slug], articleId: id });
    return json({ article });
  }, messages);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/articles:status", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { isPublished } = await parseJson(request, articleStatusSchema, { message: "Statut invalide." });
    const article = await setAdminArticleStatus(id, isPublished);
    revalidateJournal({ slugs: [article.slug], articleId: id });
    return json({ article });
  }, messages);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/articles:delete", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const previous = await requireArticle(id);
    await deleteAdminArticle(id);
    revalidateJournal({ slugs: [previous.slug], articleId: id });
    return noContent();
  }, messages);
}
