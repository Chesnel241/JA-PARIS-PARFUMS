import type { ReactNode } from "react";
import Link from "next/link";

/** État vide élégant : un titre, une phrase, une action. */
export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden>JAE</span>
      <p className="empty-state-title">{title}</p>
      {text ? <p className="empty-state-text">{text}</p> : null}
      {action ? <Link className="primary-button ghost" href={action.href}>{action.label}</Link> : null}
    </div>
  );
}
