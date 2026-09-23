import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedArticle, getPublishedArticles } from "@/lib/article-service";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ArticleCard } from "@/components/site/article-card";
import { JsonLd } from "@/components/site/json-ld";
import { formatDate, readingTime } from "@/components/site/format";
import { isApiMedia } from "@/components/site/media";
import { SITE_NAME, getSiteUrl, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: "Article introuvable", robots: { index: false } };
  return pageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/journal/${article.slug}`,
    image: article.coverImage,
    type: "article",
    publishedTime: article.publishedAt?.toISOString(),
  });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  const others = (await getPublishedArticles(4)).filter((item) => item.id !== article.id).slice(0, 3);

  // Contenu en texte simple : un paragraphe par bloc séparé d'une ligne vide.
  // Rendu sans HTML brut (pas de dangerouslySetInnerHTML) → aucun risque XSS.
  const paragraphs = article.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const date = formatDate(article.publishedAt);
  const minutes = readingTime(article.content);
  const siteUrl = getSiteUrl();
  const cover = article.coverImage;

  return (
    <div className="page-shell article-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.excerpt,
          image: cover.startsWith("http") ? cover : `${siteUrl}${cover}`,
          datePublished: article.publishedAt?.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          inLanguage: "fr-FR",
          mainEntityOfPage: `${siteUrl}/journal/${article.slug}`,
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: { "@type": "Organization", name: SITE_NAME, "@id": `${siteUrl}/#organization` },
        }}
      />
      <Link className="back-link" href="/journal"><ArrowLeft size={16} aria-hidden /> Le Journal</Link>
      <article>
        <Reveal as="header" className="article-header">
          <p className="article-meta">
            {date ? <span><time dateTime={article.publishedAt?.toISOString()}>{date}</time></span> : null}
            <span>{minutes} min de lecture</span>
          </p>
          <h1>{article.title}</h1>
          {article.excerpt ? <p className="article-excerpt">{article.excerpt}</p> : null}
        </Reveal>
        <div className="article-cover">
          <Image src={cover} alt="" fill priority sizes="(min-width: 1280px) 1200px, 100vw" unoptimized={isApiMedia(cover)} />
        </div>
        <div className="article-body">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph.split("\n").map((line, lineIndex, lines) => (
              <span key={lineIndex}>{line}{lineIndex < lines.length - 1 ? <br /> : null}</span>
            ))}</p>
          ))}
        </div>
        <footer className="article-footer">
          <Link className="text-link" href="/journal"><ArrowLeft aria-hidden /> Tous les articles</Link>
        </footer>
      </article>

      {others.length > 0 ? (
        <section className="article-next" aria-labelledby="next-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">À lire aussi</p>
              <h2 id="next-title">Dans le Journal</h2>
            </div>
          </div>
          <Stagger as="ul" className="article-grid">
            {others.map((item) => (
              <StaggerItem as="li" key={item.id}>
                <ArticleCard article={item} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}
    </div>
  );
}
