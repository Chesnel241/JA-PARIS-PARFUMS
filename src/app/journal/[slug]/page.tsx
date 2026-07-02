import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedArticle } from "@/lib/article-service";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  // Contenu en texte simple : un paragraphe par bloc séparé d'une ligne vide.
  // Rendu sans HTML brut (pas de dangerouslySetInnerHTML) → aucun risque XSS.
  const paragraphs = article.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const date = article.publishedAt
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(article.publishedAt)
    : null;

  return (
    <div className="page-shell article-page">
      <Link className="back-link" href="/journal" style={{ margin: "0 0 35px" }}><ArrowLeft size={16} /> Le Journal</Link>
      <article>
        <header className="article-header">
          <p className="eyebrow">{date ?? "Journal JAE"}</p>
          <h1>{article.title}</h1>
          <p className="article-excerpt">{article.excerpt}</p>
        </header>
        <div className="article-cover">
          <Image src={article.coverImage} alt={article.title} fill className="object-cover" unoptimized priority />
        </div>
        <div className="article-body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph.split("\n").map((line, lineIndex, lines) => (
              <span key={lineIndex}>{line}{lineIndex < lines.length - 1 ? <br /> : null}</span>
            ))}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
