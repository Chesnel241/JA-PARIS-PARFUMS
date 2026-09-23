"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Copy, ExternalLink, Gem, Plus, SprayCan, Trash2 } from "lucide-react";
import { adminRequest, type FieldErrors } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { SaveBar, Switch, TextAreaField, TextField, focusFirstInvalid, useUnsavedChanges } from "@/components/admin/form";
import { formatEuros, slugify } from "@/components/admin/format";
import { TagInput } from "@/components/admin/tag-input";
import { useToast } from "@/components/admin/toast";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ProductImagesField } from "@/components/product-images-field";

type ProductCategoryValue = "PARFUM" | "ACCESSOIRE";
type VariantDraft = { key: string; sku: string; volume: string; price: string; stock: string; isActive: boolean };
type ProductInput = {
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
type Draft = Omit<ProductInput, "id" | "variants"> & { variants: VariantDraft[] };

const SKU_PATTERN = /^[A-Z0-9_-]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let keySeed = 0;
const newKey = () => `new-${(keySeed += 1)}`;

function centsToInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

function parsePrice(value: string) {
  const normalized = value.replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function suggestSku(slug: string, volume: string) {
  const base = `${slug || "produit"}-${volume}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 64);
}

function toDraft(product?: ProductInput): Draft {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    category: product?.category ?? "PARFUM",
    description: product?.description ?? "",
    story: product?.story ?? "",
    images: product?.images ?? [],
    notesTop: product?.notesTop ?? [],
    notesHeart: product?.notesHeart ?? [],
    notesBase: product?.notesBase ?? [],
    isActive: product?.isActive ?? false,
    variants: product?.variants.length
      ? product.variants.map((variant, index) => ({ key: `v${index}`, sku: variant.sku, volume: variant.volume, price: centsToInput(variant.price), stock: String(variant.stock), isActive: variant.isActive }))
      : [{ key: "v0", sku: "", volume: "50 ml", price: "", stock: "0", isActive: true }],
  };
}

const snapshot = (draft: Draft) => JSON.stringify({ ...draft, variants: draft.variants.map((variant) => [variant.sku, variant.volume, variant.price, variant.stock, variant.isActive]) });

function validate(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  const name = draft.name.trim();
  if (name.length < 2) errors.name = "Le nom doit contenir au moins 2 caractères.";
  if (!SLUG_PATTERN.test(draft.slug) || draft.slug.length < 2) errors.slug = "Uniquement des lettres minuscules, chiffres et tirets (ex. nuit-souveraine).";
  if (draft.description.trim().length < 10) errors.description = "10 caractères minimum.";
  if (draft.story.trim().length < 10) errors.story = "10 caractères minimum.";
  if (draft.images.length === 0) errors.images = "Ajoutez au moins une image.";
  const skus = new Set<string>();
  const volumes = new Set<string>();
  draft.variants.forEach((variant, index) => {
    const sku = variant.sku.trim().toUpperCase();
    if (sku.length < 3 || sku.length > 64 || !SKU_PATTERN.test(sku)) errors[`variants.${index}.sku`] = "3 à 64 caractères : lettres, chiffres, - ou _.";
    else if (skus.has(sku)) errors[`variants.${index}.sku`] = "Ce SKU est déjà utilisé par une autre variante.";
    skus.add(sku);
    const volume = variant.volume.trim().toLowerCase();
    if (!volume) errors[`variants.${index}.volume`] = "Obligatoire.";
    else if (volumes.has(volume)) errors[`variants.${index}.volume`] = "Contenance en double.";
    volumes.add(volume);
    const price = parsePrice(variant.price);
    if (price === null) errors[`variants.${index}.price`] = "Prix invalide (ex. 135 ou 5,90).";
    else if (price > 10_000_000) errors[`variants.${index}.price`] = "Prix trop élevé.";
    if (!/^\d+$/.test(variant.stock.trim()) || Number(variant.stock) > 1_000_000) errors[`variants.${index}.stock`] = "Nombre entier ≥ 0.";
  });
  return errors;
}

export function ProductAdminForm({ product, canDelete = false, duplicatedFrom }: { product?: ProductInput; canDelete?: boolean; duplicatedFrom?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const isNew = !product?.id;
  const initial = useMemo(() => toDraft(product), [product]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [savedDraft, setSavedDraft] = useState<Draft>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew || Boolean(product?.slug));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = snapshot(draft) !== snapshot(savedDraft);
  useUnsavedChanges(dirty && !pending);

  const isParfum = draft.category === "PARFUM";
  const prices = draft.variants.map((variant) => parsePrice(variant.price)).filter((price): price is number => price !== null);
  const totalStock = draft.variants.reduce((sum, variant) => sum + (Number.parseInt(variant.stock, 10) || 0), 0);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { if (!current[key as string]) return current; const next = { ...current }; delete next[key as string]; return next; });
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setDraft((current) => ({ ...current, variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)) }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[`variants.${index}.${field}`];
      delete next.variants;
      return next;
    });
  }

  function addVariant() {
    setDraft((current) => ({ ...current, variants: [...current.variants, { key: newKey(), sku: "", volume: "", price: "", stock: "0", isActive: true }] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Le produit n'est pas enregistré", "Corrigez les champs signalés en rouge.");
      focusFirstInvalid(formRef.current);
      return;
    }
    const payload = {
      name: draft.name.trim(),
      slug: draft.slug,
      category: draft.category,
      description: draft.description.trim(),
      story: draft.story.trim(),
      images: draft.images,
      notesTop: isParfum ? draft.notesTop : [],
      notesHeart: isParfum ? draft.notesHeart : [],
      notesBase: isParfum ? draft.notesBase : [],
      isActive: draft.isActive,
      variants: draft.variants.map((variant) => ({
        sku: variant.sku.trim().toUpperCase(),
        volume: variant.volume.trim(),
        price: parsePrice(variant.price) ?? 0,
        stock: Number.parseInt(variant.stock, 10),
        isActive: variant.isActive,
      })),
    };
    setPending(true);
    const result = await adminRequest<{ product: { id: string } }>(isNew ? "/api/admin/products" : `/api/admin/products/${product?.id}`, { method: isNew ? "POST" : "PUT", json: payload });
    if (!result.ok) {
      setPending(false);
      const { variants: variantsError, ...fieldErrors } = result.fieldErrors;
      setErrors(fieldErrors);
      setFormError(variantsError ? `Variantes : ${variantsError}` : result.status === 409 ? result.error : "");
      toast.apiError(result, "Le produit n'est pas enregistré");
      focusFirstInvalid(formRef.current);
      return;
    }
    setSavedDraft(draft);
    setPending(false);
    if (isNew) {
      toast.success("Produit créé", draft.isActive ? "Il est visible dans la boutique." : "Il est enregistré en brouillon.");
      router.replace(`/admin/produits/${result.data.product.id}`);
    } else {
      toast.success("Modifications enregistrées");
    }
    router.refresh();
  }

  async function remove() {
    if (!product?.id) return;
    const ok = await confirm({
      title: `Supprimer « ${product.name} » ?`,
      description: "Le produit et ses variantes seront définitivement supprimés. S'il figure dans une commande, dépubliez-le plutôt.",
      confirmLabel: "Supprimer définitivement",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    const result = await adminRequest(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    setSavedDraft(draft);
    toast.success("Produit supprimé");
    router.replace("/admin/produits");
    router.refresh();
  }

  const title = isNew ? (duplicatedFrom ? `Copie de ${duplicatedFrom}` : "Nouveau produit") : draft.name || product?.name || "Produit";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/produits", label: "Produits" }}
        title={title}
        meta={!isNew ? <Badge tone={draft.isActive ? "success" : "neutral"}>{draft.isActive ? "Publié" : "Brouillon"}</Badge> : undefined}
        actions={!isNew ? <>
          {product?.isActive && <a className="adm-btn adm-btn--secondary" href={`/produit/${product.slug}`} target="_blank" rel="noopener"><ExternalLink aria-hidden /> Voir sur le site</a>}
          <Link className="adm-btn adm-btn--secondary" href={`/admin/produits/nouveau?dupliquer=${product?.id}`}><Copy aria-hidden /> Dupliquer</Link>
        </> : undefined}
      />

      <form ref={formRef} onSubmit={submit} noValidate>
        {formError && <div style={{ marginBottom: 20 }}><div className="adm-alert adm-alert--danger" role="alert"><CircleAlert aria-hidden /><div>{formError}</div></div></div>}
        <div className="adm-form-layout">
          <div className="adm-form-main">
            <Card title="Informations">
              <div className="adm-field">
                <span className="adm-label" id="category-label">Catégorie</span>
                <div className="adm-segmented" role="radiogroup" aria-labelledby="category-label">
                  <label><input type="radio" name="category" value="PARFUM" checked={draft.category === "PARFUM"} onChange={() => update("category", "PARFUM")} /><span><SprayCan aria-hidden /> Parfum</span></label>
                  <label><input type="radio" name="category" value="ACCESSOIRE" checked={draft.category === "ACCESSOIRE"} onChange={() => update("category", "ACCESSOIRE")} /><span><Gem aria-hidden /> Accessoire</span></label>
                </div>
              </div>
              <TextField id="product-name" label="Nom du produit" required value={draft.name} maxLength={120} error={errors.name} placeholder="Ex. Nuit Souveraine"
                onChange={(value) => { update("name", value); if (!slugTouched) update("slug", slugify(value)); }} />
              <TextField id="product-slug" label="Adresse de la page" required value={draft.slug} maxLength={140} error={errors.slug} prefix="/produit/"
                hint="Générée depuis le nom. Évitez de la modifier une fois le produit partagé."
                onChange={(value) => { setSlugTouched(true); update("slug", slugify(value)); }} />
              <TextAreaField id="product-description" label="Description courte" required rows={3} value={draft.description} maxLength={2000} showCount error={errors.description}
                hint="Affichée sous le nom, dans la fiche et les listes. Une ou deux phrases."
                onChange={(value) => update("description", value)} />
              <TextAreaField id="product-story" label={isParfum ? "Histoire du parfum" : "Description détaillée"} required rows={7} value={draft.story} maxLength={10000} showCount error={errors.story}
                hint="Le récit, l'inspiration, les matières. Un paragraphe par ligne."
                onChange={(value) => update("story", value)} />
            </Card>

            <Card title="Images" description="La première image est l'image principale de la fiche et des listes.">
              <ProductImagesField images={draft.images} onChange={(images) => update("images", images)} error={errors.images} />
            </Card>

            <Card
              title={isParfum ? "Contenances, prix et stock" : "Variantes, prix et stock"}
              description="Le stock est décrémenté automatiquement à chaque commande et restitué en cas d'annulation."
              actions={<button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={addVariant} disabled={draft.variants.length >= 12}><Plus aria-hidden /> Ajouter une variante</button>}
            >
              {errors.variants && <p className="adm-error"><CircleAlert aria-hidden />{errors.variants}</p>}
              {draft.variants.map((variant, index) => (
                <fieldset key={variant.key} style={{ margin: 0, padding: index ? "16px 0 0" : 0, border: 0, borderTop: index ? "1px solid var(--adm-border)" : 0, minWidth: 0 }}>
                  <legend className="adm-sr-only">Variante {index + 1}</legend>
                  <div className="adm-form-row adm-form-row--2">
                    <TextField id={`variant-${variant.key}-volume`} label={isParfum ? "Contenance" : "Taille / modèle"} value={variant.volume} maxLength={32} error={errors[`variants.${index}.volume`]} placeholder={isParfum ? "50 ml" : "Taille unique"}
                      onChange={(value) => updateVariant(index, { volume: value })} />
                    <TextField id={`variant-${variant.key}-sku`} label="SKU (référence interne)" value={variant.sku} maxLength={64} error={errors[`variants.${index}.sku`]} placeholder="JAE-NUIT-50ML" autoCapitalize="characters"
                      onChange={(value) => updateVariant(index, { sku: value.toUpperCase().replace(/\s+/g, "-") })}
                      onFocus={() => { if (!variant.sku && variant.volume) updateVariant(index, { sku: suggestSku(draft.slug, variant.volume) }); }} />
                    <TextField id={`variant-${variant.key}-price`} label="Prix TTC" value={variant.price} inputMode="decimal" suffix="€" error={errors[`variants.${index}.price`]} placeholder="135"
                      onChange={(value) => updateVariant(index, { price: value })} />
                    <TextField id={`variant-${variant.key}-stock`} label="Stock disponible" value={variant.stock} inputMode="numeric" suffix="unités" error={errors[`variants.${index}.stock`]}
                      onChange={(value) => updateVariant(index, { stock: value.replace(/[^\d]/g, "") })} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
                    <label className="adm-checkbox"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} /> Proposée à la vente</label>
                    {draft.variants.length > 1 && (
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }))}>
                        <Trash2 aria-hidden /> Retirer cette variante
                      </button>
                    )}
                  </div>
                </fieldset>
              ))}
            </Card>

            {isParfum && (
              <Card title="Notes olfactives" description="Affichées sur la fiche produit. Facultatif.">
                <TagInput id="notes-top" label="Notes de tête" values={draft.notesTop} onChange={(values) => update("notesTop", values)} placeholder="Safran, Bergamote…" />
                <TagInput id="notes-heart" label="Notes de cœur" values={draft.notesHeart} onChange={(values) => update("notesHeart", values)} placeholder="Rose noire…" />
                <TagInput id="notes-base" label="Notes de fond" values={draft.notesBase} onChange={(values) => update("notesBase", values)} placeholder="Oud, Vanille…" />
              </Card>
            )}
          </div>

          <aside className="adm-form-aside" aria-label="Publication et aperçu">
            <Card title="Publication">
              <Switch id="product-active" checked={draft.isActive} onChange={(value) => update("isActive", value)}
                label={draft.isActive ? "Publié dans la boutique" : "Brouillon"}
                description={draft.isActive ? "Visible et achetable par les clientes." : "Invisible sur le site tant qu'il n'est pas publié."} />
            </Card>

            <Card title="Aperçu">
              <div className="adm-preview-product">
                <div className="adm-preview-product-img" data-cover={draft.images[0] && !draft.images[0].endsWith(".svg") ? "" : undefined}>
                  {draft.images[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={draft.images[0]} alt="" />
                    : <span className="adm-center adm-muted" style={{ minHeight: "100%", fontSize: 13 }}>Aucune image</span>}
                </div>
                <div>
                  <p className="adm-eyebrow">{isParfum ? "Parfum" : "Accessoire"}</p>
                  <p style={{ font: "500 24px/1.15 var(--adm-font-display)" }}>{draft.name || "Nom du produit"}</p>
                  <p className="adm-muted">{prices.length ? `${prices.length > 1 ? "Dès " : ""}${formatEuros(Math.min(...prices))}` : "Prix à définir"}</p>
                </div>
                <div className="adm-inline-list">
                  <span>{draft.variants.length} variante{draft.variants.length > 1 ? "s" : ""}</span>
                  <span>Stock total : {totalStock}</span>
                </div>
              </div>
            </Card>

            {!isNew && canDelete && (
              <Card title="Zone sensible">
                <p className="adm-muted" style={{ fontSize: 13 }}>Un produit déjà commandé ne peut pas être supprimé : dépubliez-le.</p>
                <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" onClick={remove} disabled={deleting || pending} aria-busy={deleting || undefined}><Trash2 aria-hidden /> Supprimer le produit</button>
              </Card>
            )}
          </aside>
        </div>
        <SaveBar dirty={dirty} pending={pending} isNew={isNew} submitLabel={isNew ? "Créer le produit" : "Enregistrer"} onDiscard={() => { setDraft(savedDraft); setErrors({}); setFormError(""); }} />
      </form>
    </>
  );
}

export type { ProductInput as ProductFormValue };
