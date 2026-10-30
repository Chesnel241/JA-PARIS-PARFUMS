import type { CSSProperties } from "react";
import Image from "next/image";
import { isUnoptimizedImage, safeImageSrc } from "@/components/commerce/media";
import { paletteOf, type PaletteKey } from "@/lib/heures";
import { isPlaceholderImage } from "@/lib/placeholder";

// Ce qu'il faut savoir d'un produit pour le mettre en scène.
export type SceneSubject = {
  name: string;
  category: "PARFUM" | "ACCESSOIRE";
  palette: PaletteKey | "";
  images: string[];
};

/** Premières photos réelles d'un produit (les visuels provisoires sont ignorés). */
export function photosOf(subject: Pick<SceneSubject, "images">): string[] {
  return subject.images.filter((image) => !isPlaceholderImage(image)).map(safeImageSrc);
}

// Décalage déterministe du reflet d'un flacon à l'autre (identique serveur / client).
function sweepDelay(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${-((hash % 5) * 1.4)}s`;
}

function Bottle({ name, palette }: { name: string; palette: PaletteKey | "" }) {
  const key = palette || "or";
  const colors = paletteOf(palette);
  const label = colors.dark ? "#F3DDA6" : "#17110C";
  const upper = name.toLocaleUpperCase("fr-FR");
  const fontSize = upper.length <= 14 ? 12 : Math.max(7.5, (12 * 14) / upper.length);
  return (
    <svg viewBox="0 0 200 330" role="img" aria-label={`Flacon ${name}`}>
      <rect x="24" y="96" width="152" height="230" rx="12" fill="rgba(255,255,255,.2)" />
      <rect x="33" y="112" width="134" height="190" rx="7" fill={`url(#jb-liq-${key})`} />
      <rect x="33" y="112" width="134" height="190" rx="7" fill="url(#jb-side)" />
      <ellipse cx="100" cy="113" rx="66" ry="2.2" fill="#fff" opacity=".55" />
      <line x1="100" y1="98" x2="101" y2="296" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      <rect x="28" y="300" width="144" height="24" rx="9" fill="url(#jb-base)" />
      <rect x="24" y="96" width="152" height="230" rx="12" fill="url(#jb-glass)" stroke="rgba(60,40,20,.3)" strokeWidth="1" />
      <rect x="29" y="101" width="142" height="220" rx="9" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.1" />
      <rect x="31" y="110" width="4.5" height="196" rx="2.2" fill="#fff" opacity=".72" />
      <rect x="165" y="122" width="2.2" height="170" rx="1.1" fill="#fff" opacity=".5" />
      <g fill={label} color={label}>
        <use href="#jae-logo" x="56" y="140" width="88" height="45" />
        <text x="100" y="252" textAnchor="middle" fontSize={fontSize} letterSpacing="1.4" fontWeight="500" style={{ fontFamily: "var(--f-serif), Georgia, serif" }}>{upper}</text>
        <text x="100" y="268" textAnchor="middle" fontSize="5.6" letterSpacing="1.3" style={{ fontFamily: "var(--f-sans), Arial, sans-serif" }}>EAU DE PARFUM</text>
      </g>
      <g clipPath="url(#jb-clip)">
        <rect className="b-sweep" x="-60" y="90" width="70" height="250" fill="url(#jb-sweep)" style={{ animationDelay: sweepDelay(name) }} />
      </g>
      <rect x="84" y="66" width="32" height="32" rx="2" fill="url(#jb-cap)" />
      <rect x="84" y="72" width="32" height="1.4" fill="#000" opacity=".22" />
      <rect x="84" y="92" width="32" height="2" fill="#000" opacity=".25" />
      <rect x="60" y="6" width="80" height="62" rx="7" fill="url(#jb-crystal)" stroke="rgba(60,40,20,.28)" strokeWidth="1" />
      <rect x="66" y="12" width="68" height="50" rx="4" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1" />
      <rect x="92" y="24" width="16" height="42" rx="2" fill="url(#jb-cap)" opacity=".75" />
      <rect x="64" y="10" width="4" height="54" rx="2" fill="#fff" opacity=".7" />
      <rect x="60" y="6" width="80" height="4" rx="2" fill="#fff" opacity=".5" />
    </svg>
  );
}

function Earring({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <circle r="10" fill="url(#je-bead)" />
      <path d="M0 10v10" stroke="url(#je-gold)" strokeWidth="2.2" />
      <ellipse cx="0" cy="29" rx="6" ry="8.5" fill="none" stroke="url(#je-gold)" strokeWidth="2.6" />
      <path fillRule="evenodd" fill="url(#je-gold)" d="M0 37C30 75 36 128 0 178C-36 128-30 75 0 37ZM0 74C13 97 15 124 0 148C-15 124-13 97 0 74Z" />
      <path d="M-5 60C-16 84-19 112-10 138" stroke="#FFF6D8" strokeWidth="2" fill="none" opacity=".75" strokeLinecap="round" />
    </g>
  );
}

function Jewel({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 260 230" role="img" aria-label={name}>
      <Earring x={96} y={22} rotate={-5} />
      <Earring x={168} y={38} rotate={6} />
    </svg>
  );
}

/**
 * Visuel d'un produit dans un cadre arrondi : sa photo si elle existe, sinon
 * sa « scène » illustrée (flacon en lumière naturelle, ou bijou doré).
 */
export function Scene({ subject, photo, alt = "", sizes = "(min-width: 900px) 33vw, 100vw", priority = false, className = "", objectPosition, width }: {
  subject: SceneSubject;
  /** Photo imposée (ex. 2e image) ; sinon la première photo réelle. */
  photo?: string | null;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  objectPosition?: string;
  /** Largeur du flacon dans la scène (ex. « 32% »). */
  width?: string;
}) {
  const src = photo ? safeImageSrc(photo) : photosOf(subject)[0];
  if (src) {
    return (
      <div className={`scene photo ${className}`.trim()}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={isUnoptimizedImage(src)} className="ph-fill" style={objectPosition ? { objectPosition } : undefined} />
      </div>
    );
  }

  const isJewel = subject.category === "ACCESSOIRE";
  const colors = paletteOf(isJewel ? "or" : subject.palette);
  const style = { "--bg": colors.tint, "--bl": colors.glow, "--ink": colors.ink, ...(width ? { "--bw": width } : {}) } as CSSProperties;
  return (
    <div className={`scene${colors.dark ? " dark" : ""} ${className}`.trim()} style={style}>
      <div className="sc-light" aria-hidden="true"><i /><i /><i /><i /></div>
      {isJewel ? (
        <div className="jw"><Jewel name={subject.name} /></div>
      ) : (
        <div className="sc-bottle">
          <div className="sc-cast" />
          <Bottle name={subject.name} palette={subject.palette} />
          <div className="sc-contact" />
        </div>
      )}
    </div>
  );
}
