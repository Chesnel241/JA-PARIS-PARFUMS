import { getPublishedArticles } from "@/lib/article-service";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ArticleCard } from "@/components/site/article-card";
import { EmptyState } from "@/components/site/empty-state";
import { PageIntro } from "@/components/site/page-intro";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Journal",
    description: "Le Journal JAE Paris : coulisses de création, matières et conseils pour choisir son parfum.",
    path: "/journal",
  });
}

export default async function JournalPage() {
  const articles = await getPublishedArticles();
  const [featured, ...rest] = articles;

  return (
    <div className="page-shell journal-page">
      <PageIntro eyebrow="Journal" title="Histoires de la maison" />
      {!featured ? (
        <EmptyState title="Les premières histoires arrivent bientôt." action={{ href: "/boutique", label: "Découvrir les parfums" }} />
      ) : (
        <>
          <Reveal className="journal-featured">
            <ArticleCard article={featured} featured headingLevel="h2" priority sizes="(min-width: 900px) 58vw, 100vw" />
          </Reveal>
          {rest.length > 0 ? (
            <Stagger as="ul" className={`article-grid${rest.length === 2 ? " is-pair" : ""}`} label="Autres articles">
              {rest.map((article) => (
                <StaggerItem as="li" key={article.id}>
                  <ArticleCard article={article} headingLevel="h2" />
                </StaggerItem>
              ))}
            </Stagger>
          ) : null}
        </>
      )}
    </div>
  );
}
