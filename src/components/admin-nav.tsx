"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Images, Inbox, LayoutDashboard, Mail, Package, Palette, ShoppingBag, Sparkles, Store } from "lucide-react";

export type AdminBadges = { orders: number; applications: number };

type NavItem = { label: string; href: string; icon: typeof Package; badge?: keyof AdminBadges; badgeLabel?: string };

const sections: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: "Tableau de bord", href: "/admin", icon: LayoutDashboard }] },
  {
    title: "Ventes",
    items: [
      { label: "Commandes", href: "/admin/commandes", icon: ShoppingBag, badge: "orders", badgeLabel: "commandes à traiter" },
      { label: "Produits", href: "/admin/produits", icon: Package },
    ],
  },
  {
    title: "Contenu",
    items: [
      { label: "Journal", href: "/admin/articles", icon: BookOpen },
      { label: "Médiathèque", href: "/admin/medias", icon: Images },
      { label: "Apparence", href: "/admin/apparence", icon: Palette },
    ],
  },
  {
    title: "Communauté",
    items: [
      { label: "Ambassadrices", href: "/admin/ambassadrices", icon: Sparkles },
      { label: "Candidatures", href: "/admin/candidatures", icon: Inbox, badge: "applications", badgeLabel: "nouvelles candidatures" },
      { label: "Boutiques", href: "/admin/boutiques", icon: Store },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mail },
    ],
  },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ badges, onNavigate }: { badges: AdminBadges; onNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  return (
    <nav className="adm-nav" aria-label="Navigation de l'administration">
      {sections.map((section, index) => (
        <div className="adm-nav-section" key={section.title ?? index}>
          {section.title && <p className="adm-nav-title">{section.title}</p>}
          <ul className="adm-nav-list">
            {section.items.map(({ label, href, icon: Icon, badge, badgeLabel }) => {
              const count = badge ? badges[badge] : 0;
              return (
                <li key={href}>
                  <Link className="adm-nav-link" href={href} aria-current={isActivePath(pathname, href) ? "page" : undefined} onClick={() => onNavigate?.(href)}>
                    <Icon aria-hidden />
                    {label}
                    {count > 0 && <span className="adm-nav-badge"><span aria-hidden>{count > 99 ? "99+" : count}</span><span className="adm-sr-only">, {count} {badgeLabel}</span></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
