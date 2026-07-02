import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPublishedArticles } from "@/lib/article-service";

export const metadata = { title: "Journal" };

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const articles = await getPublishedArticles();
  return (
    <div className="page-shell editorial-page">
      <header className="page-intro">
        <p className="eyebrow">Journal JAE</p>
        <h1>Des histoires<br /><em>à respirer.</em></h1>
      </header>
      {articles.length === 0 ? (
        <div className="empty-cart"><p>Les premières histoires arrivent très bientôt.</p></div>
      ) : (
        <div className="article-list">
          {articles.map((article, index) => (
            <article key={article.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="eyebrow">{article.publishedAt ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(article.publishedAt) : "Journal"}</p>
                <h2><Link href={`/journal/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.excerpt}</p>
              </div>
              <Link href={`/journal/${article.slug}`} aria-label={`Lire ${article.title}`}><ArrowUpRight /></Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
