import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { ArticleAdminActions } from "@/components/article-admin-actions";
import { requireStaff } from "@/lib/auth-guard";
import { listAdminArticles } from "@/lib/article-service";

export const metadata = { title: "Articles · Maison" };

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const [user, articles] = await Promise.all([requireStaff(), listAdminArticles()]);
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div><p>Éditorial</p><h1>Le Journal.</h1></div>
        <Link className="admin-create-button" href="/admin/articles/nouveau"><Plus /> Nouvel article</Link>
      </header>
      <div className="admin-product-list">
        <div className="admin-product-list-head article-list-grid"><span>Article</span><span>Statut</span><span>Publié le</span><span>Actions</span></div>
        {articles.length === 0 ? (
          <div className="admin-empty">Aucun article. Racontez votre première histoire.</div>
        ) : articles.map((article) => (
          <article className="admin-product-row article-list-grid" key={article.id}>
            <div className="admin-product-identity">
              <div className="admin-product-thumb">{article.coverImage && <Image src={article.coverImage} alt="" width={64} height={80} unoptimized />}</div>
              <div>
                <Link href={`/admin/articles/${article.id}`}>{article.title}</Link>
                <small>/journal/{article.slug}</small>
              </div>
            </div>
            <span><i className={article.isPublished ? "published" : "draft"} />{article.isPublished ? "Publié" : "Brouillon"}</span>
            <span>{article.publishedAt ? dateFormatter.format(article.publishedAt) : "—"}</span>
            <ArticleAdminActions id={article.id} title={article.title} isPublished={article.isPublished} />
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
