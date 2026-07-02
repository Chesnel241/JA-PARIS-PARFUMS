import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ArticleAdminForm } from "@/components/article-admin-form";
import { requireStaff } from "@/lib/auth-guard";
import { getAdminArticle } from "@/lib/article-service";

export const metadata = { title: "Modifier l'article · Maison" };

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, article] = await Promise.all([requireStaff(), getAdminArticle(id)]);
  if (!article) notFound();
  return <AdminShell user={user}><ArticleAdminForm article={article} /></AdminShell>;
}
