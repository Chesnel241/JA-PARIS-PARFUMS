import Link from "next/link";
import type { Product } from "@/lib/data";
import { PageIntro } from "@/components/site/page-intro";
import { ProductGrid } from "@/components/site/product-grid";
import { EmptyState } from "@/components/site/empty-state";

const TABS = [
  { label: "Parfums", href: "/boutique" },
  { label: "Accessoires", href: "/accessoires" },
];

/** Gabarit commun des pages catalogue (/boutique, /accessoires). */
export function CatalogPage({ current, eyebrow, title, lede, products, unit, empty }: {
  current: "/boutique" | "/accessoires";
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  products: Product[];
  unit: [string, string];
  empty: { title: string; text: string };
}) {
  return (
    <div className="page-shell catalog-page">
      <PageIntro eyebrow={eyebrow} title={title} lede={lede} />
      <div className="catalog-toolbar">
        <nav aria-label="Catalogue">
          <ul className="catalog-tabs">
            {TABS.map((tab) => (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={tab.href === current ? "page" : undefined}>{tab.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="catalog-count">{products.length} {products.length > 1 ? unit[1] : unit[0]}</p>
      </div>
      {products.length === 0 ? (
        <EmptyState title={empty.title} text={empty.text} action={{ href: "/", label: "Retour à l’accueil" }} />
      ) : (
        <ProductGrid products={products} headingLevel="h2" label={typeof title === "string" ? title : eyebrow} priorityCount={2} />
      )}
    </div>
  );
}
