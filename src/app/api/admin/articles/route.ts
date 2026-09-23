import { handleApi, json, parseJson, requireApiStaff } from "@/lib/api";
import { createAdminArticle, listAdminArticles } from "@/lib/article-service";
import { articleInputSchema } from "@/lib/article-validation";
import { revalidateJournal } from "@/lib/revalidate";

const messages = { conflict: "Un article utilise déjà ce slug." };

export async function GET() {
  return handleApi("admin/articles:list", async () => {
    await requireApiStaff();
    return json({ articles: await listAdminArticles() });
  });
}

export async function POST(request: Request) {
  return handleApi("admin/articles:create", async () => {
    await requireApiStaff();
    const input = await parseJson(request, articleInputSchema);
    const article = await createAdminArticle(input);
    revalidateJournal({ slugs: [article.slug], articleId: article.id });
    return json({ article }, { status: 201 });
  }, messages);
}
