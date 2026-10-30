"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/data";
import { dayGradient, daySegments, dePrefix, formatMinutes, paletteOf, slotAt } from "@/lib/heures";
import { isAvailable, shownVariant } from "@/lib/maison";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { Scene, type SceneSubject } from "@/components/maison/scene";
import { useAccent, useMaison } from "@/components/maison/maison-context";

export type HeroFeatured = {
  slug: string;
  name: string;
  hour: string | null;
  meta: string;
  subject: SceneSubject;
};

const TICKS = [0, 25, 50, 75, 100];

/**
 * Héros « Quelle heure êtes-vous ? » : l'heure de Paris désigne le parfum du
 * moment ; la réglette permet de simuler une autre heure. Rendu serveur sans
 * heure (texte neutre), l'heure n'apparaît qu'après montage.
 */
export function Hero({ campaign, campaignAlt, orsImage, featured }: {
  campaign: string;
  campaignAlt: string;
  orsImage: string;
  featured: HeroFeatured | null;
}) {
  const { schedule, now } = useMaison();
  const [simulated, setSimulated] = useState<number | null>(null);
  const minutes = simulated ?? now;
  const slot = minutes === null ? null : slotAt(schedule, minutes);
  const item = slot?.item ?? null;
  const time = minutes === null ? "" : formatMinutes(minutes);
  const live = simulated === null;
  useAccent(item ? paletteOf(item.palette).accent : null);

  const gradient = useMemo(() => {
    const colors = new Map(schedule.map(({ item: entry }) => [entry.slug, paletteOf(entry.palette).band]));
    return dayGradient(daySegments(schedule), (slug) => colors.get(slug) ?? paletteOf("").band);
  }, [schedule]);

  const shown = item ? shownVariant(item) : null;
  const itemMeta = item && shown ? `${item.hour ?? ""} · ${formatPrice(shown.price)}${isAvailable(item) ? "" : " · Bientôt de retour"}` : "";

  return (
    <section className="wrap hero" aria-labelledby="hero-title">
      <div className="hero-top">
        <div>
          <p className="live">
            <span className="dot" aria-hidden="true" />
            {item && time ? (
              live ? (
                <span>Il est <strong className="tab">{time}</strong> à Paris · C’est l’heure {dePrefix(item.name)}<strong>{item.name}</strong></span>
              ) : (
                <span>Simulation · À <strong className="tab">{time}</strong>, c’est l’heure {dePrefix(item.name)}<strong>{item.name}</strong></span>
              )
            ) : (
              <span>Une eau de parfum pour chaque heure du jour</span>
            )}
          </p>
          <h1 className="h-xl" id="hero-title">
            <span className="ln">Quelle{" "}
              <span className="scrib">heure
                <svg viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength={1} d="M18 52C22 20 92 8 160 12C214 15 238 36 226 58C212 82 128 88 70 80C26 74 6 60 14 40C20 26 44 16 72 12" /></svg>
              </span>
            </span>
            <br />
            <span className="ln">êtes-vous&nbsp;?</span>
          </h1>
        </div>
        <div className="hero-side">
          <p className="lead">Des eaux de parfum composées à Paris. Une pour chaque lumière du jour. Trouvez la vôtre, et laissez votre sillage.</p>
          <div className="btn-row">
            {item ? (
              <Link className="btn" href={`/produit/${item.slug}`}>Découvrir {item.name}<span className="ico"><ArrowIcon /></span></Link>
            ) : (
              <Link className="btn" href="/boutique">Découvrir les parfums<span className="ico"><ArrowIcon /></span></Link>
            )}
            <Link className="btn btn-line" href="/trouver-mon-heure">Trouver mon heure</Link>
          </div>
        </div>
      </div>

      <div className="hero-bento">
        <figure className="hb-photo">
          <Image className="ph-fill" src={campaign} alt={campaignAlt} fill priority sizes="(min-width: 980px) 36vw, 50vw" unoptimized={isUnoptimizedImage(campaign)} />
          {featured?.hour ? <figcaption className="chip tab">{featured.name} · {featured.hour}</figcaption> : null}
        </figure>

        {featured ? (
          <Link className="hb-photo" href={`/produit/${featured.slug}`} aria-label={`Voir ${featured.name}, ${featured.meta}`}>
            <Scene subject={featured.subject} sizes="(min-width: 980px) 33vw, 50vw" priority />
            <span className="hb-card-info">
              <span><span className="nm">{featured.name}</span><span className="meta">{featured.meta}</span></span>
              <span className="plus" aria-hidden="true"><ArrowIcon /></span>
            </span>
          </Link>
        ) : (
          <Link className="hb-photo" href="/boutique" aria-label="Voir la collection">
            <Image className="ph-fill" src={orsImage} alt="" fill sizes="(min-width: 980px) 33vw, 50vw" unoptimized={isUnoptimizedImage(orsImage)} />
          </Link>
        )}

        <div className="hb-side">
          {schedule.length > 0 ? (
            <div className="hb-time">
              <div className="hb-time-top">
                <label htmlFor="hour-range">Changer d’heure</label>
                <span className="hb-time-big" aria-hidden="true">{time}</span>
              </div>
              {item ? (
                <Link className="hb-now" href={`/produit/${item.slug}`}>
                  <span className="th"><Scene subject={item} sizes="46px" /></span>
                  <span><small>C’est l’heure de</small><strong>{item.name}</strong><small className="tab">{itemMeta}</small></span>
                  <span className="plus" aria-hidden="true"><ArrowIcon /></span>
                </Link>
              ) : (
                <div className="hb-now" aria-hidden="true" />
              )}
              <div className="scrub" style={{ "--scrub": gradient } as React.CSSProperties}>
                <input
                  type="range"
                  id="hour-range"
                  min={0}
                  max={1439}
                  step={5}
                  value={minutes ?? 0}
                  aria-valuetext={item && time ? `${time}, ${item.name}` : undefined}
                  onChange={(event) => setSimulated(Number(event.target.value))}
                />
                <div className="scrub-ticks" aria-hidden="true">
                  {TICKS.map((tick) => <span key={tick} style={{ left: `${tick}%` }}>{String((tick / 100) * 24).padStart(2, "0")}</span>)}
                </div>
              </div>
              {!live ? <button type="button" className="scrub-reset" onClick={() => setSimulated(null)}>Revenir à l’heure de Paris</button> : null}
            </div>
          ) : (
            <Link className="hb-time" href="/trouver-mon-heure">
              <span className="hb-time-top"><strong>Trouver mon heure</strong></span>
              <span className="muted">Quatre questions pour trouver le parfum qui vous ressemble.</span>
            </Link>
          )}
          <Link className="hb-ors" href="/accessoires" aria-label="Les Ors, boucles d’oreilles dorées">
            <Image className="ph-fill" src={orsImage} alt="" fill sizes="(min-width: 980px) 30vw, 100vw" unoptimized={isUnoptimizedImage(orsImage)} />
            <span className="hb-card-info">
              <span><span className="nm">Les Ors</span><span className="meta">Boucles d’oreilles dorées</span></span>
              <span className="plus" aria-hidden="true"><ArrowIcon /></span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
