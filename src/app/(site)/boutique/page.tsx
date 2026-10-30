import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { getPublicProducts } from "@/lib/catalog";
import { sortByDay } from "@/lib/maison";
import { HeuresExplorer } from "@/components/collection/heures-explorer";
import { ArrowIcon } from "@/components/maison/icons";
import { PageHead } from "@/components/site/page-head";
import { ProductGrid } from "@/components/site/product-grid";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Les Heures, la collection",
    description: "Les eaux de parfum JAE Paris : une collection qui suit la lumière du jour, une heure par parfum. En 50 ou 100 ml, livraison offerte dès 50 €.",
    path: "/boutique",
  });
}

export default async function CollectionPage() {
  const products = await getPublicProducts();
  const perfumes = sortByDay(products.filter((product) => product.category === ProductCategory.PARFUM));
  const accessories = products.filter((product) => product.category === ProductCategory.ACCESSOIRE);
  const timed = perfumes.filter((perfume) => perfume.hour);
  const all = [...perfumes, ...accessories];

  return (
    <>
      <PageHead
        tag="La collection"
        dot
        title={<>Les <span className="serif">Heures</span></>}
        lead={timed.length > 0
          ? "Une collection qui suit la lumière du jour. Chaque eau de parfum porte une heure. Touchez une heure de la journée pour découvrir son parfum."
          : "Une collection qui suit la lumière du jour. Chaque eau de parfum porte une heure."}
      />

      {timed.length > 0 ? <HeuresExplorer perfumes={timed} /> : null}

      <section className="wrap" style={{ paddingBottom: "clamp(20px, 4vw, 40px)" }} aria-labelledby="maison-title">
        <div className="sec-head" style={{ marginBottom: 28 }}>
          <h2 className="h-lg" id="maison-title">Toute la <span className="serif">maison</span></h2>
          <p className="muted">Eaux de parfum{accessories.length > 0 ? " · Accessoires en laiton doré" : ""}</p>
        </div>
        {all.length > 0 ? (
          <ProductGrid products={all} dense priorityCount={timed.length > 0 ? 0 : 2} label="Toute la maison" />
        ) : (
          <div className="vide">
            <p>La collection arrive bientôt.</p>
            <p>Nos parfums seront très prochainement disponibles. La Lettre JAE vous préviendra dès leur arrivée.</p>
            <Link className="btn" href="/journal">Lire le Journal<span className="ico"><ArrowIcon /></span></Link>
          </div>
        )}
      </section>
    </>
  );
}
