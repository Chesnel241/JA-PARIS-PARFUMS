import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { ArticlesTable } from "@/components/admin/articles-table";
import { requireAdminStaff } from "@/components/admin/staff";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { listAdminArticles } from "@/lib/article-service";

export const metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const [, articles] = await Promise.all([requireAdminStaff(), listAdminArticles()]);
  return (
    <>
      <PageHeader
        eyebrow="Contenu"
        title="Journal"
        description="Les articles publiés apparaissent sur la page Journal et sur l'accueil (les 3 plus récents)."
        actions={<Link className="adm-btn adm-btn--primary" href="/admin/articles/nouveau"><Plus aria-hidden /> Nouvel article</Link>}
      />
      {articles.length === 0 ? (
        <div className="adm-card">
          <EmptyState icon={BookOpen} title="Aucun article pour le moment" description="Racontez les coulisses de la maison, vos conseils, vos nouveautés." action={<Link className="adm-btn adm-btn--primary" href="/admin/articles/nouveau"><Plus aria-hidden /> Écrire un article</Link>} />
        </div>
      ) : (
        <ArticlesTable articles={articles.map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          coverImage: article.coverImage,
          isPublished: article.isPublished,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          updatedAt: article.updatedAt.toISOString(),
        }))} />
      )}
    </>
  );
}
