"use client";

import Link from "next/link";
import { BookOpen, Box, CircleDollarSign, PackageCheck, Store, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  ["Vue d’ensemble", "/admin", CircleDollarSign],
  ["Produits", "/admin/produits", Box],
  ["Commandes", "/admin/commandes", PackageCheck],
  ["Articles", "/admin/articles", BookOpen],
  ["Ambassadrices", "/admin/ambassadrices", Users],
  ["Boutiques", "/admin/boutiques", Store],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav>{links.map(([label, href, Icon]) => <Link key={href} className={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "active" : ""} href={href}><Icon /> {label}</Link>)}</nav>;
}
