"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProductImagesField } from "@/components/product-images-field";

type ProductCategoryValue = "PARFUM" | "ACCESSOIRE";
type VariantDraft = { sku: string; volume: string; price: string; stock: string; isActive: boolean };
type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  category: ProductCategoryValue;
  description: string;
  story: string;
  images: string[];
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  isActive: boolean;
  variants: { sku: string; volume: string; price: number; stock: number; isActive: boolean }[];
};

const emptyVariant: VariantDraft = { sku: "", volume: "50 ml", price: "135", stock: "0", isActive: true };

function commaList(values: string[]) { return values.join(", "); }
function splitComma(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function ProductAdminForm({ product }: { product?: ProductDraft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [category, setCategory] = useState<ProductCategoryValue>(product?.category ?? "PARFUM");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [description, setDescription] = useState(product?.description ?? "");
  const [story, setStory] = useState(product?.story ?? "");
  const [images, setImages] = useState<string[]>(product?.images?.length ? product.images : []);
  const [notesTop, setNotesTop] = useState(commaList(product?.notesTop ?? []));
  const [notesHeart, setNotesHeart] = useState(commaList(product?.notesHeart ?? []));
  const [notesBase, setNotesBase] = useState(commaList(product?.notesBase ?? []));
  const [isActive, setIsActive] = useState(product?.isActive ?? false);
  const [variants, setVariants] = useState<VariantDraft[]>(product?.variants.map((variant) => ({ ...variant, price: (variant.price / 100).toFixed(0), stock: String(variant.stock) })) ?? [{ ...emptyVariant }]);
  const title = useMemo(() => product ? `Modifier ${product.name}` : "Nouveau produit", [product]);
  const isParfum = category === "PARFUM";

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (images.length === 0) {
      setError("Ajoutez au moins une image (téléversement ou adresse).");
      return;
    }
    const payload = {
      name, slug, category, description, story,
      images,
      notesTop: isParfum ? splitComma(notesTop) : [],
      notesHeart: isParfum ? splitComma(notesHeart) : [],
      notesBase: isParfum ? splitComma(notesBase) : [],
      isActive,
      variants: variants.map((variant) => ({ ...variant, price: Math.round(Number(variant.price.replace(",", ".")) * 100), stock: Number(variant.stock) })),
    };

    startTransition(async () => {
      const response = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Enregistrement impossible." }));
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      router.push("/admin/produits");
      router.refresh();
    });
  }

  return <div className="product-form-page">
    <header className="admin-content-header"><div><Link href="/admin/produits"><ArrowLeft /> Produits</Link><h1>{title}</h1></div></header>
    <form className="product-admin-form" onSubmit={submit}>
      <div className="product-form-main">
        <section className="admin-form-card"><h2>Identité</h2><label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value as ProductCategoryValue)}><option value="PARFUM">Parfum</option><option value="ACCESSOIRE">Accessoire</option></select></label><label>Nom du produit<input value={name} onChange={(event) => { setName(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)); }} required minLength={2} /></label><label>Slug<input value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} required /></label><label>Description courte<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} rows={4} /></label><label>Histoire du parfum<textarea value={story} onChange={(event) => setStory(event.target.value)} required minLength={10} rows={8} /></label></section>
        <section className="admin-form-card"><div className="form-card-heading"><h2>Contenances</h2><button type="button" onClick={() => setVariants((current) => [...current, { ...emptyVariant, sku: "", volume: "" }])}><Plus /> Ajouter</button></div>{variants.map((variant, index) => <div className="variant-admin-row" key={index}><label>SKU<input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} required /></label><label>Contenance<input value={variant.volume} onChange={(event) => updateVariant(index, { volume: event.target.value })} required /></label><label>Prix (€)<input value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} type="number" min="0" step="0.01" required /></label><label>Stock<input value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} type="number" min="0" required /></label><label className="checkbox-label"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} /> Active</label>{variants.length > 1 && <button className="remove-variant" type="button" aria-label="Supprimer la variante" onClick={() => setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))}><Trash2 /></button>}</div>)}</section>
      </div>
      <aside className="product-form-aside"><section className="admin-form-card"><h2>Publication</h2><label className="publish-toggle"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>{isActive ? "Publié dans la boutique" : "Brouillon invisible"}</span></label></section><section className="admin-form-card"><h2>Images du produit</h2><ProductImagesField images={images} onChange={setImages} /></section>{isParfum && <section className="admin-form-card"><h2>Notes olfactives</h2><label>Tête<input value={notesTop} onChange={(event) => setNotesTop(event.target.value)} placeholder="Safran, Bergamote" /></label><label>Cœur<input value={notesHeart} onChange={(event) => setNotesHeart(event.target.value)} /></label><label>Fond<input value={notesBase} onChange={(event) => setNotesBase(event.target.value)} /></label></section>}{error && <p className="admin-form-error">{error}</p>}<button className="primary-button" disabled={pending}>{pending ? <><LoaderCircle className="spin" /> Enregistrement…</> : <><Save /> Enregistrer</>}</button></aside>
    </form>
  </div>;
}
