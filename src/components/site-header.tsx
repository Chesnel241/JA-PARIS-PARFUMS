"use client";

import Link from "next/link";
import { Menu, Search, ShoppingBag, X, User } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";

const links = [
  ["La maison", "/#maison"],
  ["Parfums", "/boutique"],
  ["Journal", "/journal"],
  ["Ambassadrices", "/ambassadrices"],
  ["Boutiques", "/boutiques"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="site-header">
      <button className="icon-button mobile-only" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
      <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Navigation principale">
        <button className="icon-button close-menu" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X size={22} /></button>
        {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <Link className="wordmark" href="/" aria-label="JAE Paris, accueil"><span>JAE</span><small>PARIS</small></Link>
      <div className="header-actions">
        <Link className="icon-button search-button" href="/recherche" aria-label="Rechercher">
          <Search size={19} />
        </Link>
        <Link className="icon-button user-link" href="/compte" aria-label="Mon compte">
          <User size={19} />
        </Link>
        <Link className="bag-link" href="/panier" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
          <div className="relative inline-flex items-center" style={{ position: 'relative' }}>
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[#E91E63] text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
