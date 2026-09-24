import Image from "next/image";
import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import { getPublicStores } from "@/lib/community-service";
import { Reveal } from "@/components/motion";
import { PageIntro } from "@/components/site/page-intro";
import { EmptyState } from "@/components/site/empty-state";
import { isApiMedia } from "@/components/site/media";
import { pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Boutiques",
    description: "Retrouvez JAE Paris en boutique : adresses, horaires, téléphone et itinéraire.",
    path: "/boutiques",
  });
}

function mapsUrl(parts: string[]) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(", "))}`;
}

export default async function StoresPage() {
  const stores = await getPublicStores();

  return (
    <div className="page-shell stores-page">
      <PageIntro eyebrow="Points de vente" title="Nos boutiques" lede="Venez découvrir nos créations en personne." />
      {stores.length === 0 ? (
        <EmptyState
          title="Nos adresses seront bientôt annoncées."
          text="En attendant, toute la collection est disponible en ligne."
          action={{ href: "/boutique", label: "Découvrir les parfums" }}
        />
      ) : (
        <ul className="store-list">
          {stores.map((store, index) => {
            const locality = [store.city, store.country].filter(Boolean).join(", ");
            return (
              <li key={store.id}>
                <Reveal as="article" className="store-card">
                  <div className="store-card-media">
                    <Image src={store.image} alt={`Boutique ${store.name}`} fill sizes="(min-width: 900px) 58vw, 100vw" priority={index === 0} unoptimized={isApiMedia(store.image)} className="parallax-img" data-parallax="0.08" />
                  </div>
                  <div className="store-card-body">
                    <p className="eyebrow">{store.city}</p>
                    <h2>{store.name}</h2>
                    <dl className="store-details">
                      <div>
                        <dt><MapPin aria-hidden size={18} /><span className="sr-only">Adresse</span></dt>
                        <dd><address>{store.address}<br />{locality}</address></dd>
                      </div>
                      <div>
                        <dt><Clock aria-hidden size={18} /><span className="sr-only">Horaires</span></dt>
                        <dd>{store.openingHours}</dd>
                      </div>
                      {store.phone ? (
                        <div>
                          <dt><Phone aria-hidden size={18} /><span className="sr-only">Téléphone</span></dt>
                          <dd><a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}>{store.phone}</a></dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="store-actions">
                      <a className="primary-button" href={mapsUrl([store.address, store.city, store.country])} target="_blank" rel="noopener noreferrer">
                        Itinéraire <ArrowUpRight aria-hidden />
                        <span className="sr-only"> vers {store.name} (Google Maps, nouvel onglet)</span>
                      </a>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
