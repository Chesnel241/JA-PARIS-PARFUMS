import { notFound } from "next/navigation";
import { ArticleAdminForm } from "@/components/article-admin-form";
import { requireAdminStaff } from "@/components/admin/staff";
import { getAdminArticle } from "@/lib/article-service";

export const metadata = { title: "Modifier l'article" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, article] = await Promise.all([requireAdminStaff(), getAdminArticle(id)]);
  if (!article) notFound();
  return (
    <ArticleAdminForm
      key={article.id}
      article={{ id: article.id, title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content, coverImage: article.coverImage, isPublished: article.isPublished }}
    />
  );
}
