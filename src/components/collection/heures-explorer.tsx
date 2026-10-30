"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { buildSchedule, daySegments, paletteOf, slotAt } from "@/lib/heures";
import { buyVariant, hourLabel, shownVariant } from "@/lib/maison";
import { ArrowIcon } from "@/components/maison/icons";
import { Notes3 } from "@/components/maison/notes";
import { Scene } from "@/components/maison/scene";
import { useAccent, useMaison } from "@/components/maison/maison-context";
import { QuickAdd } from "@/components/site/quick-add";

const TICKS = [
  { left: "0%", label: "00:00" },
  { left: "25%", label: "06:00" },
  { left: "50%", label: "12:00" },
  { left: "75%", label: "18:00" },
  { left: "100%", label: "24:00" },
];

/**
 * La journée des parfums : une frise de 0 h à 24 h découpée en créneaux.
 * Toucher une heure affiche son parfum. Au chargement, l'heure de Paris
 * sélectionne le parfum du moment (tant que la visiteuse n'a rien choisi).
 */
export function HeuresExplorer({ perfumes }: { perfumes: Product[] }) {
  const { now } = useMaison();
  const schedule = useMemo(() => buildSchedule(perfumes), [perfumes]);
  const segments = useMemo(() => daySegments(schedule), [schedule]);
  const [selected, setSelected] = useState<string | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    if (touched.current || now === null) return;
    const slot = slotAt(schedule, now);
    if (slot) setSelected(slot.item.slug);
  }, [now, schedule]);

  const current = perfumes.find((perfume) => perfume.slug === selected) ?? schedule[0]?.item ?? null;
  useAccent(current ? paletteOf(current.palette).accent : null);
  if (!current) return null;

  const shown = shownVariant(current);
  const buy = buyVariant(current);
  const bySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume]));

  return (
    <section className="wrap jour" aria-label="La journée des parfums">
      <div>
        <div className="jour-bar" role="group" aria-label="Choisir une heure">
          {segments.map((segment, index) => {
            const perfume = bySlug.get(segment.slug);
            if (!perfume) return null;
            const colors = paletteOf(perfume.palette);
            return (
              <button
                key={`${segment.slug}-${index}`}
                type="button"
                className="seg"
                aria-pressed={current.slug === segment.slug}
                aria-hidden={segment.primary ? undefined : true}
                tabIndex={segment.primary ? undefined : -1}
                style={{ left: `calc(${segment.left}% + 4px)`, width: `calc(${segment.width}% - 8px)`, background: colors.tint, color: colors.ink }}
                onClick={() => { touched.current = true; setSelected(segment.slug); }}
              >
                {segment.primary ? <><span className="tab">{perfume.hour}</span><span className="nm">{perfume.name}</span></> : null}
              </button>
            );
          })}
        </div>
        <div className="jour-ticks" aria-hidden="true">
          {TICKS.map((tick) => <span key={tick.label} style={{ left: tick.left }}>{tick.label}</span>)}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{current.name}, {hourLabel(current)}</p>

      <div className="jour-detail" key={current.slug}>
        <div className="jd-vis">
          <Scene subject={current} sizes="(min-width: 980px) 52vw, 100vw" alt={`${current.name}, eau de parfum`} />
        </div>
        <div>
          {hourLabel(current) ? <span className="tag tab"><span className="dot" />{hourLabel(current)}</span> : null}
          <h2 className="p-name">{current.name}</h2>
          {current.tagline ? <p className="p-tag">{current.tagline}</p> : null}
          <p className="p-desc">{current.description}</p>
          <Notes3 notes={current.notes} />
          {shown ? (
            <div className="buy-line">
              <span className="price">{formatPrice(shown.price)}<small>{shown.volume}</small></span>
              {buy ? <span className="stat ok">Disponible</span> : <span className="stat wait">Bientôt de retour</span>}
            </div>
          ) : null}
          <div className="btn-row">
            <Link className="btn" href={`/produit/${current.slug}`}>Voir le parfum<span className="ico"><ArrowIcon /></span></Link>
            {buy ? (
              <QuickAdd className="btn btn-line" label={`Ajouter ${current.name}, ${buy.volume}, au panier`} item={{ slug: current.slug, name: current.name, image: current.image, volume: buy.volume, price: buy.price, stock: buy.stock }}>
                Ajouter au panier · {buy.volume}
              </QuickAdd>
            ) : (
              <Link className="btn btn-line" href={`/produit/${current.slug}#alerte`}>M’avertir du retour</Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
