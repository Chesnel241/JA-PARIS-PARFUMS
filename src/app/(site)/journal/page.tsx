import Image from "next/image";
import Link from "next/link";
import { getPublishedArticles } from "@/lib/article-service";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { ArticleCard } from "@/components/site/article-card";
import { formatDate, readingTime } from "@/components/site/format";
import { PageHead } from "@/components/site/page-head";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Le Journal",
    description: "Le Journal JAE Paris : les coulisses des créations, les matières, et des conseils pour choisir et porter son parfum.",
    path: "/journal",
  });
}

export default async function JournalPage() {
  const articles = await getPublishedArticles();
  const [featured, ...rest] = articles;

  return (
    <>
      <PageHead
        tag="Le Journal"
        title={<>Histoires de <span className="serif">la maison</span></>}
        lead="Les coulisses des créations, les matières, et des conseils pour choisir et porter son parfum."
      />
      {!featured ? (
        <section className="wrap" style={{ paddingBottom: "clamp(40px, 6vw, 80px)" }}>
          <div className="vide">
            <p>Les premières histoires arrivent bientôt.</p>
            <p>En attendant, découvrez les parfums de la maison.</p>
            <Link className="btn" href="/boutique">Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
          </div>
        </section>
      ) : (
        <section className="wrap journal-grid" aria-label="Articles">
          <article className="une" aria-labelledby="une-title">
            <Link className="une-ph" href={`/journal/${featured.slug}`} tabIndex={-1} aria-hidden="true">
              <Image className="ph-fill" src={featured.coverImage} alt="" fill priority sizes="(min-width: 980px) 58vw, 100vw" unoptimized={isUnoptimizedImage(featured.coverImage)} />
            </Link>
            <span className="tag">
              {[formatDate(featured.publishedAt), `${readingTime(featured.content)} min de lecture`].filter(Boolean).join(" · ")}
            </span>
            <h2 className="h-lg" id="une-title"><Link href={`/journal/${featured.slug}`}>{featured.title}</Link></h2>
            {featured.excerpt ? <p className="chapo">{featured.excerpt}</p> : null}
            <Link className="lien" href={`/journal/${featured.slug}`} aria-label={`Lire l’article : ${featured.title}`}>Lire l’article <ArrowIcon /></Link>
          </article>
          {rest.length > 0 ? (
            <ul className="a-venir" aria-label="Autres articles">
              {rest.map((article) => (
                <li key={article.id}><ArticleCard article={article} /></li>
              ))}
            </ul>
          ) : null}
        </section>
      )}
    </>
  );
}
