"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ArticleAdminActions } from "@/components/article-admin-actions";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { formatDate } from "@/components/admin/format";
import { Badge, EmptyState, Thumb } from "@/components/admin/ui";

export type ArticleRow = { id: string; title: string; slug: string; coverImage: string; isPublished: boolean; publishedAt: string | null; updatedAt: string };

export function ArticlesTable({ articles }: { articles: ArticleRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return articles.filter((article) => {
      if (filter === "published" && !article.isPublished) return false;
      if (filter === "draft" && article.isPublished) return false;
      return !q || normalizeSearch(`${article.title} ${article.slug}`).includes(q);
    });
  }, [articles, query, filter]);

  const tabs = [
    { key: "all" as const, label: "Tous", count: articles.length },
    { key: "published" as const, label: "Publiés", count: articles.filter((article) => article.isPublished).length },
    { key: "draft" as const, label: "Brouillons", count: articles.filter((article) => !article.isPublished).length },
  ];

  return (
    <>
      <div className="adm-tabs" role="group" aria-label="Filtrer les articles">
        {tabs.map((tab) => <button key={tab.key} type="button" className="adm-tab" aria-pressed={filter === tab.key} onClick={() => setFilter(tab.key)}>{tab.label}<span className="adm-tab-count">{tab.count}</span></button>)}
      </div>
      <div className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <LocalSearchField id="article-search" label="Rechercher un article" placeholder="Titre ou adresse…" value={query} onChange={setQuery} />
          <span className="adm-toolbar-meta" aria-live="polite">{visible.length} article{visible.length > 1 ? "s" : ""}</span>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="Aucun article trouvé" description="Modifiez la recherche ou le filtre." />
        ) : (
          <table className="adm-table">
            <caption className="adm-sr-only">Articles du Journal</caption>
            <thead><tr><th scope="col">Article</th><th scope="col">Statut</th><th scope="col">Publication</th><th scope="col"><span className="adm-sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visible.map((article) => (
                <tr key={article.id} data-clickable>
                  <td className="adm-td-primary">
                    <div className="adm-cell-main">
                      <Thumb src={article.coverImage} size="lg" />
                      <div className="adm-cell-main-text">
                        <Link className="adm-row-link adm-cell-title" href={`/admin/articles/${article.id}`}>{article.title}</Link>
                        <span className="adm-cell-sub">/journal/{article.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Statut"><Badge tone={article.isPublished ? "success" : "neutral"}>{article.isPublished ? "Publié" : "Brouillon"}</Badge></td>
                  <td data-label="Publication"><span className="adm-cell-sub">{article.publishedAt ? formatDate(article.publishedAt) : `Modifié le ${formatDate(article.updatedAt)}`}</span></td>
                  <td className="adm-td-actions"><ArticleAdminActions id={article.id} title={article.title} isPublished={article.isPublished} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
