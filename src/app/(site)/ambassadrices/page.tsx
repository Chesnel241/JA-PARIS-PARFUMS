import Image from "next/image";
import { ArrowDown, AtSign } from "lucide-react";
import { getPublicAmbassadors } from "@/lib/community-service";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { AmbassadorForm } from "@/components/site/ambassador-form";
import { PageIntro } from "@/components/site/page-intro";
import { isApiMedia } from "@/components/site/media";
import { getCachedSiteImages, pageMetadata } from "@/components/site/seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return pageMetadata({
    title: "Ambassadrices",
    description: "Rencontrez les ambassadrices JAE Paris et proposez votre candidature pour rejoindre le programme.",
    path: "/ambassadrices",
  });
}

function instagramUrl(handle: string) {
  if (/^https?:\/\//i.test(handle)) return handle;
  return `https://www.instagram.com/${handle.replace(/^@/, "").trim()}/`;
}

function instagramHandle(handle: string) {
  const match = handle.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match ? match[1] : handle).replace(/^@/, "")}`;
}

export default async function AmbassadorsPage() {
  const [ambassadors, images] = await Promise.all([getPublicAmbassadors(), getCachedSiteImages()]);
  const hasAmbassadors = ambassadors.length > 0;
  const visual = images["home.essence.image"];

  return (
    <>
      {hasAmbassadors ? (
        <div className="page-shell ambassadors-page">
          <PageIntro eyebrow="Programme ambassadrices" title="Les ambassadrices" lede="Elles portent la maison au quotidien.">
            <a className="primary-button" href="#candidature">Devenir ambassadrice <ArrowDown aria-hidden /></a>
          </PageIntro>
          <section className="ambassadors-section" aria-label="Nos ambassadrices">
            <Stagger as="ul" className="ambassador-grid">
              {ambassadors.map((ambassador, index) => (
                <StaggerItem as="li" key={ambassador.id}>
                  <article className="ambassador-card">
                    <div className="ambassador-portrait">
                      <Image
                        src={ambassador.photo}
                        alt={`Portrait de ${ambassador.name}`}
                        fill
                        sizes="(min-width: 900px) 33vw, 50vw"
                        priority={index < 2}
                        unoptimized={isApiMedia(ambassador.photo)}
                      />
                    </div>
                    <div className="ambassador-body">
                      {ambassador.role ? <p className="eyebrow">{ambassador.role}</p> : null}
                      <h3>{ambassador.name}</h3>
                      {ambassador.description ? <p>{ambassador.description}</p> : null}
                      {ambassador.instagram ? (
                        <a className="ambassador-instagram" href={instagramUrl(ambassador.instagram)} target="_blank" rel="noopener noreferrer">
                          <AtSign aria-hidden size={15} /> {instagramHandle(ambassador.instagram)}
                          <span className="sr-only"> (Instagram, nouvel onglet)</span>
                        </a>
                      ) : null}
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        </div>
      ) : null}

      <section id="candidature" className={`candidature${hasAmbassadors ? "" : " is-featured"}`} aria-labelledby="candidature-title">
        <div className="candidature-media">
          <Image src={visual} alt="" fill sizes="(min-width: 1024px) 42vw, 100vw" priority={!hasAmbassadors} unoptimized={isApiMedia(visual)} />
        </div>
        <Reveal className="candidature-content">
          <p className="eyebrow">Programme ambassadrices</p>
          {hasAmbassadors ? (
            <h2 id="candidature-title">Devenir ambassadrice</h2>
          ) : (
            <h1 id="candidature-title">Devenir ambassadrice</h1>
          )}
          <p className="candidature-lede">Vous aimez nos créations et souhaitez les faire rayonner ? Présentez-vous.</p>
          <ol className="candidature-steps">
            <li>Vous remplissez le formulaire.</li>
            <li>Nous étudions votre profil.</li>
            <li>Nous vous recontactons par e-mail.</li>
          </ol>
          <AmbassadorForm />
        </Reveal>
      </section>
    </>
  );
}
