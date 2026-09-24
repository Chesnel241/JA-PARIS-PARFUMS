import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/components/site/format";
import { isApiMedia } from "@/components/site/media";

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: Date | null;
};

/** Carte éditoriale « image d'abord » (Journal). */
export function ArticleCard({ article, sizes = "(min-width: 900px) 33vw, 100vw", headingLevel = "h3", featured = false, priority = false }: {
  article: ArticleSummary;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  featured?: boolean;
  priority?: boolean;
}) {
  const Heading = headingLevel;
  const date = formatDate(article.publishedAt);
  return (
    <article className={`article-card${featured ? " is-featured" : ""}`}>
      <Link href={`/journal/${article.slug}`} className="article-card-link">
        <div className="article-card-media">
          <Image src={article.coverImage} alt="" fill sizes={sizes} priority={priority} unoptimized={isApiMedia(article.coverImage)} className="article-card-img" />
        </div>
        <div className="article-card-body">
          {date ? <p className="eyebrow"><time dateTime={article.publishedAt?.toISOString()}>{date}</time></p> : null}
          <Heading className="article-card-title">{article.title}</Heading>
          {featured && article.excerpt ? <p className="article-card-excerpt">{article.excerpt}</p> : null}
          <span className="article-card-more" aria-hidden>Lire</span>
        </div>
      </Link>
    </article>
  );
}
