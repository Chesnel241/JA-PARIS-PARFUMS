import type { CSSProperties, ReactNode } from "react";

/** En-tête des pages intérieures : sur-titre, titre en capitales, une phrase au plus. */
export function PageIntro({ eyebrow, title, lede, children, align = "start" }: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <header className={`page-intro${align === "center" ? " is-centered" : ""}`} data-load-fade="">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="page-lede">{lede}</p> : null}
      {children ? <div style={{ marginTop: 32 } as CSSProperties}>{children}</div> : null}
    </header>
  );
}
