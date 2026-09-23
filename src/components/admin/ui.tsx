import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, ImageOff, Info, TriangleAlert } from "lucide-react";
import type { Tone } from "@/components/admin/labels";

// Composants de présentation sans état : utilisables dans les Server
// Components comme dans les Client Components.

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function PageHeader({ eyebrow, title, description, back, actions, meta }: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="adm-page-header">
      <div className="adm-page-header-text">
        {back && <Link className="adm-back" href={back.href}><ArrowLeft aria-hidden /> {back.label}</Link>}
        {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
        <h1 className="adm-title">{title}</h1>
        {meta && <div className="adm-page-meta">{meta}</div>}
        {description && <p className="adm-subtitle">{description}</p>}
      </div>
      {actions && <div className="adm-header-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, description, actions, children, footer, className = "", flush = false, id, as: Tag = "section" }: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  flush?: boolean;
  id?: string;
  as?: "section" | "div" | "article";
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag className={`adm-card ${flush ? "adm-card--flush" : ""} ${className}`} id={id} aria-labelledby={title && headingId ? headingId : undefined}>
      {(title || actions) && (
        <div className="adm-card-header">
          <div className="adm-card-header-text">
            {title && <h2 className="adm-card-title" id={headingId}>{title}</h2>}
            {description && <p className="adm-card-desc">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children !== undefined && <div className="adm-card-body">{children}</div>}
      {footer && <div className="adm-card-footer">{footer}</div>}
    </Tag>
  );
}

export function Badge({ tone = "neutral", children, plain = false }: { tone?: Tone; children: ReactNode; plain?: boolean }) {
  return <span className={`adm-badge adm-badge--${tone} ${plain ? "adm-badge--plain" : ""}`}>{children}</span>;
}

export function EmptyState({ icon: IconComponent, title, description, action, headingLevel = 2 }: {
  icon: Icon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="adm-empty">
      <span className="adm-empty-icon" aria-hidden><IconComponent /></span>
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

const ALERT_ICONS: Record<string, Icon> = { danger: CircleAlert, warning: TriangleAlert, info: Info, success: CircleCheck };

export function Alert({ tone = "info", title, children, role }: { tone?: "danger" | "warning" | "info" | "success"; title?: ReactNode; children?: ReactNode; role?: "alert" | "status" }) {
  const IconComponent = ALERT_ICONS[tone];
  return (
    <div className={`adm-alert adm-alert--${tone}`} role={role}>
      <IconComponent aria-hidden />
      <div>
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

// Vignette d'image. <img> natif : les images téléversées sont servies par
// /api/media (déjà en cache immuable) et les URL externes ne dépendent ainsi
// d'aucune configuration de l'optimiseur d'images.
export function Thumb({ src, alt = "", size = "md", contain = false }: { src?: string | null; alt?: string; size?: "md" | "lg" | "portrait"; contain?: boolean }) {
  const sizeClass = size === "lg" ? "adm-thumb--lg" : size === "portrait" ? "adm-thumb--portrait" : "";
  return (
    <span className={`adm-thumb ${sizeClass} ${contain ? "adm-thumb--contain" : ""}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <span className="adm-thumb-empty" aria-hidden><ImageOff /></span>
      )}
    </span>
  );
}

export function KpiCard({ label, value, meta, icon: IconComponent, href, tone }: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon: Icon;
  href?: string;
  tone?: "warning" | "info" | "success" | "brand";
}) {
  const content = (
    <>
      <span className="adm-kpi-head">{label}<span className="adm-kpi-icon" aria-hidden><IconComponent /></span></span>
      <strong className="adm-kpi-value">{value}</strong>
      {meta && <span className="adm-kpi-meta">{meta}</span>}
    </>
  );
  return href
    ? <Link className="adm-kpi" href={href} data-tone={tone}>{content}</Link>
    : <div className="adm-kpi" data-tone={tone}>{content}</div>;
}

export function Pagination({ page, pageCount, total, hrefFor, label }: { page: number; pageCount: number; total: number; hrefFor: (page: number) => string; label: string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="adm-pagination" aria-label={`Pagination des ${label}`}>
      <span>Page {page} sur {pageCount} · {total.toLocaleString("fr-FR")} {label}</span>
      <span className="adm-pagination-links">
        {page > 1
          ? <Link className="adm-btn adm-btn--secondary adm-btn--sm" href={hrefFor(page - 1)} rel="prev"><ChevronLeft aria-hidden /> Précédente</Link>
          : <span className="adm-btn adm-btn--secondary adm-btn--sm" aria-disabled="true"><ChevronLeft aria-hidden /> Précédente</span>}
        {page < pageCount
          ? <Link className="adm-btn adm-btn--secondary adm-btn--sm" href={hrefFor(page + 1)} rel="next">Suivante <ChevronRight aria-hidden /></Link>
          : <span className="adm-btn adm-btn--secondary adm-btn--sm" aria-disabled="true">Suivante <ChevronRight aria-hidden /></span>}
      </span>
    </nav>
  );
}
