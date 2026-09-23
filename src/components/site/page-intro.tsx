import type { ReactNode } from "react";
import { Reveal } from "@/components/motion";

/** En-tête sobre des pages intérieures : sur-titre, titre, une phrase au plus. */
export function PageIntro({ eyebrow, title, lede, children, align = "start" }: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <Reveal as="header" className={`page-intro${align === "center" ? " is-centered" : ""}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="page-lede">{lede}</p> : null}
      {children}
    </Reveal>
  );
}
