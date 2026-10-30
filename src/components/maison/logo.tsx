import { LOGO_PATH } from "@/components/maison/logo-path";
import { PALETTES, PALETTE_KEYS } from "@/lib/heures";

/**
 * Sprite SVG rendu une seule fois par page : le symbole du logotype et les
 * dégradés du flacon illustré (un jus par palette). Les SVG de la page s'y
 * réfèrent par `href="#jae-logo"` / `url(#jb-…)`. Il ne doit jamais être en
 * display:none (les dégradés ne seraient plus peints) : il est simplement
 * réduit à 0 × 0.
 */
export function MaisonSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="jae-logo" viewBox="0 0 557 285">
          <path fill="currentColor" fillRule="evenodd" d={LOGO_PATH} />
        </symbol>
        <linearGradient id="jb-cap" x1="0" x2="1">
          <stop offset="0" stopColor="#6A4B1A" /><stop offset=".2" stopColor="#C79B4E" /><stop offset=".42" stopColor="#FBEBC0" />
          <stop offset=".58" stopColor="#D5AC60" /><stop offset=".82" stopColor="#8A6527" /><stop offset="1" stopColor="#4A3310" />
        </linearGradient>
        {PALETTE_KEYS.map((key) => (
          <linearGradient key={key} id={`jb-liq-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PALETTES[key].liquid[0]} stopOpacity=".88" />
            <stop offset=".65" stopColor={PALETTES[key].liquid[1]} stopOpacity=".92" />
            <stop offset="1" stopColor={PALETTES[key].liquid[1]} />
          </linearGradient>
        ))}
        <linearGradient id="jb-side" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".28" /><stop offset=".16" stopColor="#000" stopOpacity="0" />
          <stop offset=".84" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id="jb-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".62" /><stop offset=".06" stopColor="#fff" stopOpacity=".12" /><stop offset=".5" stopColor="#fff" stopOpacity=".04" />
          <stop offset=".94" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="jb-crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".75" /><stop offset=".35" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#fff" stopOpacity=".45" />
        </linearGradient>
        <linearGradient id="jb-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="jb-sweep" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".42" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="jb-clip"><rect x="24" y="96" width="152" height="230" rx="12" /></clipPath>
        <linearGradient id="je-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE7B0" /><stop offset=".3" stopColor="#D6AA58" /><stop offset=".55" stopColor="#94692A" />
          <stop offset=".78" stopColor="#E8C47A" /><stop offset="1" stopColor="#7A5520" />
        </linearGradient>
        <radialGradient id="je-bead" cx=".35" cy=".35" r=".7">
          <stop offset="0" stopColor="#FFF3CF" /><stop offset=".45" stopColor="#D6AA58" /><stop offset="1" stopColor="#7A5520" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Logotype JAE Paris (couleur : currentColor). */
export function Logo({ className = "logo-svg", title = "JAE Paris" }: { className?: string; title?: string | null }) {
  return (
    <svg className={className} viewBox="0 0 557 285" role={title ? "img" : undefined} aria-label={title ?? undefined} aria-hidden={title ? undefined : true} focusable="false">
      <use href="#jae-logo" />
    </svg>
  );
}
