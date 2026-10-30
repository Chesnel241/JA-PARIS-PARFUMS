import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedArticle, getPublishedArticles } from "@/lib/article-service";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { ArticleCard } from "@/components/site/article-card";
import { JsonLd } from "@/components/site/json-ld";
import { formatDate, readingTime } from "@/components/site/format";
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

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ol"; items: { title: string; text: string }[] };

const LIST_ITEM = /^\d{1,2}[.)]\s+/;

/**
 * Contenu en texte simple, sans HTML brut (aucun dangerouslySetInnerHTML,
 * donc aucun risque XSS) : un paragraphe par bloc séparé d'une ligne vide ;
 * un bloc dont toutes les lignes commencent par « 1. », « 2. »… devient une
 * liste numérotée (« Titre — texte » met le titre en valeur).
 */
function parseContent(content: string): Block[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): Block => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every((line) => LIST_ITEM.test(line))) {
        return {
          kind: "ol",
          items: lines.map((line) => {
            const body = line.replace(LIST_ITEM, "");
            const split = body.match(/^(.{2,80}?)\s+[—–-]\s+(.+)$/);
            return split ? { title: split[1], text: split[2] } : { title: body, text: "" };
          }),
        };
      }
      return { kind: "p", lines };
    });
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  const others = (await getPublishedArticles(4)).filter((item) => item.id !== article.id).slice(0, 3);
  const blocks = parseContent(article.content);
  const date = formatDate(article.publishedAt);
  const minutes = readingTime(article.content);
  const siteUrl = getSiteUrl();
  const cover = article.coverImage;

  return (
    <article className="wrap article">
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
      <header className="article-tete">
        <nav aria-label="Fil d’Ariane">
          <ol className="crumbs">
            <li><Link href="/">Accueil</Link></li>
            <li><Link href="/journal">Le Journal</Link></li>
            <li aria-current="page">{article.title}</li>
          </ol>
        </nav>
        <span className="tag">
          {date ? <><time dateTime={article.publishedAt?.toISOString()}>{date}</time> · </> : null}{minutes} min de lecture
        </span>
        <h1 className="h-lg">{article.title}</h1>
        {article.excerpt ? <p className="chapo">{article.excerpt}</p> : null}
      </header>
      <div className="article-cover">
        <Image className="ph-fill" src={cover} alt="" fill priority sizes="(min-width: 1400px) 1300px, 100vw" unoptimized={isUnoptimizedImage(cover)} />
      </div>
      <div className="article-corps">
        {blocks.map((block, index) =>
          block.kind === "ol" ? (
            <ol key={index}>
              {block.items.map((item, position) => (
                <li key={position}><strong>{item.title}</strong>{item.text ? <span>{item.text}</span> : null}</li>
              ))}
            </ol>
          ) : (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <span key={lineIndex}>{line}{lineIndex < block.lines.length - 1 ? <br /> : null}</span>
              ))}
            </p>
          ),
        )}
        <div className="article-pied">
          <Link className="btn btn-line" href="/journal">Tous les articles</Link>
          <Link className="btn" href="/trouver-mon-heure">Trouver mon heure<span className="ico"><ArrowIcon /></span></Link>
        </div>
      </div>

      {others.length > 0 ? (
        <section className="autres" aria-labelledby="next-title">
          <div className="sec-head"><h2 className="h-lg" id="next-title">Dans le <span className="serif">Journal</span></h2></div>
          <ul className="a-venir">
            {others.map((item) => <li key={item.id}><ArticleCard article={item} /></li>)}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
