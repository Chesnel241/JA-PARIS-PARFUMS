"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { ProductAdminActions } from "@/components/product-admin-actions";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { formatEuros } from "@/components/admin/format";
import { LOW_STOCK_THRESHOLD } from "@/components/admin/labels";
import { Badge, EmptyState, Thumb } from "@/components/admin/ui";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category: "PARFUM" | "ACCESSOIRE";
  image: string | null;
  isActive: boolean;
  minPrice: number | null;
  stock: number;
  variantCount: number;
  lowVariants: number;
  skus: string[];
};

type Filter = "all" | "PARFUM" | "ACCESSOIRE" | "draft" | "low";

export function ProductsTable({ products, canDelete }: { products: ProductRow[]; canDelete: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => ({
    all: products.length,
    PARFUM: products.filter((product) => product.category === "PARFUM").length,
    ACCESSOIRE: products.filter((product) => product.category === "ACCESSOIRE").length,
    draft: products.filter((product) => !product.isActive).length,
    low: products.filter((product) => product.lowVariants > 0).length,
  }), [products]);

  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return products.filter((product) => {
      if (filter === "PARFUM" || filter === "ACCESSOIRE") { if (product.category !== filter) return false; }
      if (filter === "draft" && product.isActive) return false;
      if (filter === "low" && product.lowVariants === 0) return false;
      if (!q) return true;
      return normalizeSearch(`${product.name} ${product.slug} ${product.skus.join(" ")}`).includes(q);
    });
  }, [products, query, filter]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "PARFUM", label: "Parfums" },
    { key: "ACCESSOIRE", label: "Accessoires" },
    { key: "draft", label: "Brouillons" },
    { key: "low", label: "Stock bas" },
  ];

  return (
    <>
      <div className="adm-tabs" role="group" aria-label="Filtrer les produits">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className="adm-tab" aria-pressed={filter === tab.key} onClick={() => setFilter(tab.key)}>
            {tab.label}<span className="adm-tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>
      <div className="adm-card adm-card--flush">
        <div className="adm-toolbar">
          <LocalSearchField id="product-search" label="Rechercher un produit" placeholder="Nom, adresse ou SKU…" value={query} onChange={setQuery} />
          <span className="adm-toolbar-meta" aria-live="polite">{visible.length} produit{visible.length > 1 ? "s" : ""}</span>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="Aucun produit trouvé" description="Modifiez la recherche ou le filtre." action={<button type="button" className="adm-btn adm-btn--secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Tout afficher</button>} />
        ) : (
          <table className="adm-table">
            <caption className="adm-sr-only">Produits du catalogue</caption>
            <thead>
              <tr><th scope="col">Produit</th><th scope="col">Statut</th><th scope="col">Stock</th><th scope="col" className="adm-align-right">Prix</th><th scope="col"><span className="adm-sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id} data-clickable>
                  <td className="adm-td-primary">
                    <div className="adm-cell-main">
                      <Thumb src={product.image} contain={product.image?.endsWith(".svg")} size="portrait" />
                      <div className="adm-cell-main-text">
                        <Link className="adm-row-link adm-cell-title" href={`/admin/produits/${product.id}`}>{product.name}</Link>
                        <span className="adm-cell-sub">{product.category === "ACCESSOIRE" ? "Accessoire" : "Parfum"} · {product.variantCount} variante{product.variantCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Statut"><Badge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Publié" : "Brouillon"}</Badge></td>
                  <td data-label="Stock">
                    {product.stock === 0
                      ? <Badge tone="danger">Rupture</Badge>
                      : product.lowVariants > 0
                        ? <Badge tone="warning">{product.stock} · stock bas</Badge>
                        : <span className="adm-num">{product.stock} en stock</span>}
                  </td>
                  <td className="adm-align-right adm-td-aside"><span className="adm-num" style={{ color: "var(--adm-text)", fontWeight: 600 }}>{product.minPrice === null ? "—" : `${product.variantCount > 1 ? "dès " : ""}${formatEuros(product.minPrice)}`}</span></td>
                  <td className="adm-td-actions"><ProductAdminActions id={product.id} name={product.name} isActive={product.isActive} canDelete={canDelete} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="adm-help" style={{ marginTop: 12 }}>« Stock bas » : au moins une variante proposée à la vente avec {LOW_STOCK_THRESHOLD} unités ou moins.</p>
    </>
  );
}
