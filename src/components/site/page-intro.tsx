import type { CSSProperties, ReactNode } from "react";
import { RevealText } from "@/components/experience/reveal-text";

/**
 * En-tête des pages intérieures : sur-titre, titre révélé mot à mot dès
 * l'affichage (CSS, sans attendre JavaScript), une phrase au plus.
 */
export function PageIntro({ eyebrow, title, lede, children, align = "start" }: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <header className={`page-intro${align === "center" ? " is-centered" : ""}`}>
      {eyebrow ? <p className="eyebrow" data-load-fade="">{eyebrow}</p> : null}
      <RevealText as="h1" mode="load" delay={0.05}>{title}</RevealText>
      {lede ? <p className="page-lede" data-load-fade="" style={{ "--d": 0.35 } as CSSProperties}>{lede}</p> : null}
      {children ? <div data-load-fade="" style={{ "--d": 0.5 } as CSSProperties}>{children}</div> : null}
    </header>
  );
}
