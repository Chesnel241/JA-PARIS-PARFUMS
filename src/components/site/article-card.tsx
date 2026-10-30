import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/components/site/format";
import { isUnoptimizedImage } from "@/components/commerce/media";

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: Date | null;
};

/** Carte compacte du Journal : vignette, date, titre, chapô. */
export function ArticleCard({ article, headingLevel = "h3" }: { article: ArticleSummary; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const date = formatDate(article.publishedAt);
  return (
    <Link className="a-card" href={`/journal/${article.slug}`}>
      <div className="av">
        <Image className="ph-fill" src={article.coverImage} alt="" fill sizes="120px" unoptimized={isUnoptimizedImage(article.coverImage)} />
      </div>
      <div className="at">
        {date ? <span className="small muted"><time dateTime={article.publishedAt?.toISOString()}>{date}</time></span> : null}
        <Heading>{article.title}</Heading>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
      </div>
    </Link>
  );
}
