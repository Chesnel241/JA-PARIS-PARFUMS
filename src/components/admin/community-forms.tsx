"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Clock, ExternalLink, MapPin, Phone, Trash2 } from "lucide-react";
import { adminRequest, isValidImageReference, type FieldErrors } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { SaveBar, Switch, TextAreaField, TextField, focusFirstInvalid, useUnsavedChanges } from "@/components/admin/form";
import { instagramHandle, instagramUrl } from "@/components/admin/format";
import { useToast } from "@/components/admin/toast";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ImageUploader } from "@/components/image-uploader";

type Kind = "ambassador" | "store";

// Logique commune : état, validation, enregistrement, suppression.
function useEntityForm<T extends Record<string, unknown>>({ kind, id, initial, validate, toPayload }: {
  kind: Kind;
  id?: string;
  initial: T;
  validate: (draft: T) => FieldErrors;
  toPayload: (draft: T) => object;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<T>(initial);
  const [savedDraft, setSavedDraft] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNew = !id;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  useUnsavedChanges(dirty && !pending);
  const endpoint = kind === "ambassador" ? "/api/admin/ambassadors" : "/api/admin/stores";
  const listPath = kind === "ambassador" ? "/admin/ambassadrices" : "/admin/boutiques";
  const noun = kind === "ambassador" ? "Ambassadrice" : "Boutique";

  function update<K extends keyof T>(key: K, value: T[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { if (!current[key as string]) return current; const next = { ...current }; delete next[key as string]; return next; });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error(`${noun} non enregistrée`, "Corrigez les champs signalés en rouge.");
      focusFirstInvalid(formRef.current);
      return;
    }
    setPending(true);
    const result = await adminRequest<Record<string, { id: string }>>(isNew ? endpoint : `${endpoint}/${id}`, { method: isNew ? "POST" : "PUT", json: toPayload(draft) });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      toast.apiError(result, `${noun} non enregistrée`);
      focusFirstInvalid(formRef.current);
      return;
    }
    setSavedDraft(draft);
    if (isNew) {
      const created = result.data?.[kind];
      toast.success(`${noun} ajoutée`, draft.isActive ? "Elle est visible sur le site." : "Elle est masquée tant que vous ne l'activez pas.");
      router.replace(created?.id ? `${listPath}/${created.id}` : listPath);
    } else {
      toast.success("Modifications enregistrées");
    }
    router.refresh();
  }

  async function remove(name: string) {
    if (!id) return;
    const ok = await confirm({ title: `Supprimer « ${name} » ?`, description: "Cette fiche sera définitivement retirée du site. Pour la masquer temporairement, désactivez-la plutôt.", confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return;
    setDeleting(true);
    const result = await adminRequest(`${endpoint}/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    setSavedDraft(draft);
    toast.success(`« ${name} » a été supprimée`);
    router.replace(listPath);
    router.refresh();
  }

  return { formRef, draft, setDraft, savedDraft, errors, setErrors, pending, deleting, isNew, dirty, update, submit, remove, listPath };
}

function parseOrder(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : NaN;
}

function orderError(value: string) {
  const number = parseOrder(value);
  return !/^\d+$/.test(value.trim()) || number < 0 || number > 9999 ? "Nombre entier entre 0 et 9999." : undefined;
}

// ——— Ambassadrice ———
type AmbassadorDraft = { name: string; role: string; photo: string; description: string; instagram: string; isActive: boolean; sortOrder: string };

export function AmbassadorForm({ ambassador, nextSortOrder = 10 }: {
  ambassador?: { id: string; name: string; role: string; photo: string; description: string; instagram: string | null; isActive: boolean; sortOrder: number };
  nextSortOrder?: number;
}) {
  const form = useEntityForm<AmbassadorDraft>({
    kind: "ambassador",
    id: ambassador?.id,
    initial: {
      name: ambassador?.name ?? "",
      role: ambassador?.role ?? "",
      photo: ambassador?.photo ?? "",
      description: ambassador?.description ?? "",
      instagram: ambassador?.instagram ?? "",
      isActive: ambassador?.isActive ?? true,
      sortOrder: String(ambassador?.sortOrder ?? nextSortOrder),
    },
    validate: (draft) => {
      const errors: FieldErrors = {};
      if (draft.name.trim().length < 2) errors.name = "2 caractères minimum.";
      if (!isValidImageReference(draft.photo)) errors.photo = "Ajoutez une photo.";
      if (draft.description.trim().length < 10) errors.description = "10 caractères minimum.";
      if (draft.instagram.trim() && !instagramUrl(draft.instagram)) errors.instagram = "Indiquez un identifiant (@jae.paris) ou une adresse instagram.com.";
      const order = orderError(draft.sortOrder);
      if (order) errors.sortOrder = order;
      return errors;
    },
    toPayload: (draft) => ({
      name: draft.name.trim(),
      role: draft.role.trim(),
      photo: draft.photo.trim(),
      description: draft.description.trim(),
      instagram: draft.instagram.trim(),
      isActive: draft.isActive,
      sortOrder: parseOrder(draft.sortOrder),
    }),
  });
  const { draft, errors, update } = form;
  const link = instagramUrl(draft.instagram);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/ambassadrices", label: "Ambassadrices" }}
        title={form.isNew ? "Nouvelle ambassadrice" : draft.name || "Ambassadrice"}
        meta={!form.isNew ? <Badge tone={draft.isActive ? "success" : "neutral"}>{draft.isActive ? "Visible sur le site" : "Masquée"}</Badge> : undefined}
      />
      <form ref={form.formRef} onSubmit={form.submit} noValidate>
        <div className="adm-form-layout">
          <div className="adm-form-main">
            <Card title="Portrait">
              <div id="ambassador-photo" tabIndex={-1} aria-invalid={errors.photo ? true : undefined}>
                <ImageUploader id="ambassador-photo-field" value={draft.photo} onChange={(value) => update("photo", value)} error={errors.photo} aspectRatio="4 / 5" label="photo" />
              </div>
              <p className="adm-hint">Format portrait conseillé (4:5), visage dans le tiers supérieur.</p>
            </Card>
            <Card title="Présentation">
              <div className="adm-form-row adm-form-row--2">
                <TextField id="ambassador-name" label="Prénom ou nom" required value={draft.name} maxLength={80} error={errors.name} placeholder="Inès" onChange={(value) => update("name", value)} />
                <TextField id="ambassador-role" label="Métier / signature" optional value={draft.role} maxLength={80} error={errors.role} placeholder="Photographe" onChange={(value) => update("role", value)} />
              </div>
              <TextAreaField id="ambassador-description" label="Texte de présentation" required rows={5} value={draft.description} maxLength={600} showCount error={errors.description}
                hint="Deux ou trois phrases : sa personnalité, son parfum JAE." onChange={(value) => update("description", value)} />
              <TextField id="ambassador-instagram" label="Instagram" optional value={draft.instagram} maxLength={80} error={errors.instagram} prefix={<AtSign size={16} />} placeholder="jae.paris"
                hint={link ? <>Lien : <a className="adm-link" href={link} target="_blank" rel="noopener">{instagramHandle(draft.instagram)} <ExternalLink size={12} aria-hidden style={{ display: "inline" }} /></a></> : "Identifiant ou adresse du profil."}
                onChange={(value) => update("instagram", value)} />
            </Card>
          </div>
          <aside className="adm-form-aside" aria-label="Affichage et aperçu">
            <Card title="Affichage">
              <Switch id="ambassador-active" checked={draft.isActive} onChange={(value) => update("isActive", value)} label={draft.isActive ? "Visible sur le site" : "Masquée"} description="Page « Ambassadrices » de la boutique." />
              <TextField id="ambassador-sortOrder" label="Ordre d'affichage" value={draft.sortOrder} inputMode="numeric" maxLength={4} error={errors.sortOrder} hint="Les plus petits nombres s'affichent en premier. Réorganisez aussi depuis la liste." onChange={(value) => update("sortOrder", value.replace(/[^\d]/g, ""))} />
            </Card>
            <Card title="Aperçu">
              <div className="adm-preview-card">
                <div className="adm-preview-card-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isValidImageReference(draft.photo) ? <img src={draft.photo} alt="" style={{ objectPosition: "center 25%" }} /> : <span className="adm-center adm-muted" style={{ minHeight: "100%" }}>Photo</span>}
                </div>
                <div className="adm-preview-card-body">
                  {draft.role && <small>{draft.role}</small>}
                  <strong>{draft.name || "Prénom"}</strong>
                  <p>{draft.description || "Texte de présentation…"}</p>
                </div>
              </div>
            </Card>
            {!form.isNew && (
              <Card title="Zone sensible">
                <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" disabled={form.deleting || form.pending} onClick={() => form.remove(form.savedDraft.name)}><Trash2 aria-hidden /> Supprimer l&apos;ambassadrice</button>
              </Card>
            )}
          </aside>
        </div>
        <SaveBar dirty={form.dirty} pending={form.pending} isNew={form.isNew} submitLabel={form.isNew ? "Ajouter l'ambassadrice" : "Enregistrer"} onDiscard={() => { form.setDraft(form.savedDraft); form.setErrors({}); }} />
      </form>
    </>
  );
}

// ——— Boutique ———
type StoreDraft = { name: string; address: string; city: string; country: string; phone: string; openingHours: string; image: string; isActive: boolean; sortOrder: string };

export function StoreForm({ store, nextSortOrder = 10 }: {
  store?: { id: string; name: string; address: string; city: string; country: string; phone: string | null; openingHours: string; image: string; isActive: boolean; sortOrder: number };
  nextSortOrder?: number;
}) {
  const form = useEntityForm<StoreDraft>({
    kind: "store",
    id: store?.id,
    initial: {
      name: store?.name ?? "",
      address: store?.address ?? "",
      city: store?.city ?? "",
      country: store?.country ?? "France",
      phone: store?.phone ?? "",
      openingHours: store?.openingHours ?? "",
      image: store?.image ?? "",
      isActive: store?.isActive ?? true,
      sortOrder: String(store?.sortOrder ?? nextSortOrder),
    },
    validate: (draft) => {
      const errors: FieldErrors = {};
      if (draft.name.trim().length < 2) errors.name = "2 caractères minimum.";
      if (draft.address.trim().length < 4) errors.address = "4 caractères minimum.";
      if (draft.city.trim().length < 2) errors.city = "2 caractères minimum.";
      if (draft.country.trim().length < 2) errors.country = "2 caractères minimum.";
      if (draft.phone.trim() && !/^[+()\d\s.-]{6,40}$/.test(draft.phone.trim())) errors.phone = "Numéro invalide (chiffres, espaces, +, ( ), . ou -).";
      if (draft.openingHours.trim().length < 2) errors.openingHours = "Indiquez les horaires.";
      if (!isValidImageReference(draft.image)) errors.image = "Ajoutez une photo de la boutique.";
      const order = orderError(draft.sortOrder);
      if (order) errors.sortOrder = order;
      return errors;
    },
    toPayload: (draft) => ({
      name: draft.name.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      country: draft.country.trim(),
      phone: draft.phone.trim(),
      openingHours: draft.openingHours.trim(),
      image: draft.image.trim(),
      isActive: draft.isActive,
      sortOrder: parseOrder(draft.sortOrder),
    }),
  });
  const { draft, errors, update } = form;
  const mapsUrl = draft.address.trim() && draft.city.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${draft.address}, ${draft.city}, ${draft.country}`)}` : null;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/boutiques", label: "Boutiques" }}
        title={form.isNew ? "Nouvelle boutique" : draft.name || "Boutique"}
        meta={!form.isNew ? <Badge tone={draft.isActive ? "success" : "neutral"}>{draft.isActive ? "Visible sur le site" : "Masquée"}</Badge> : undefined}
      />
      <form ref={form.formRef} onSubmit={form.submit} noValidate>
        <div className="adm-form-layout">
          <div className="adm-form-main">
            <Card title="Coordonnées">
              <TextField id="store-name" label="Nom de la boutique" required value={draft.name} maxLength={120} error={errors.name} placeholder="Maison JAE · Paris" onChange={(value) => update("name", value)} />
              <TextField id="store-address" label="Adresse" required value={draft.address} maxLength={200} error={errors.address} placeholder="24, rue du Bac" autoComplete="street-address" onChange={(value) => update("address", value)} />
              <div className="adm-form-row adm-form-row--2">
                <TextField id="store-city" label="Code postal et ville" required value={draft.city} maxLength={80} error={errors.city} placeholder="75007 Paris" onChange={(value) => update("city", value)} />
                <TextField id="store-country" label="Pays" required value={draft.country} maxLength={80} error={errors.country} onChange={(value) => update("country", value)} />
              </div>
              <TextField id="store-phone" label="Téléphone" optional type="tel" value={draft.phone} maxLength={40} error={errors.phone} placeholder="+33 1 84 80 20 24" autoComplete="tel" onChange={(value) => update("phone", value)} />
              <TextAreaField id="store-openingHours" label="Horaires d'ouverture" required rows={3} value={draft.openingHours} maxLength={200} showCount error={errors.openingHours}
                hint="Ex. Lun–Sam · 10h30–19h. Une ligne par période si besoin." onChange={(value) => update("openingHours", value)} />
              {mapsUrl && <p className="adm-help"><MapPin aria-hidden /><span>Vérifier l&apos;adresse sur <a className="adm-link" href={mapsUrl} target="_blank" rel="noopener">Google Maps</a>.</span></p>}
            </Card>
            <Card title="Photo de la boutique">
              <div id="store-image" tabIndex={-1} aria-invalid={errors.image ? true : undefined}>
                <ImageUploader id="store-image-field" value={draft.image} onChange={(value) => update("image", value)} error={errors.image} aspectRatio="16 / 10" label="photo" />
              </div>
            </Card>
          </div>
          <aside className="adm-form-aside" aria-label="Affichage et aperçu">
            <Card title="Affichage">
              <Switch id="store-active" checked={draft.isActive} onChange={(value) => update("isActive", value)} label={draft.isActive ? "Visible sur le site" : "Masquée"} description="Page « Boutiques » de la boutique en ligne." />
              <TextField id="store-sortOrder" label="Ordre d'affichage" value={draft.sortOrder} inputMode="numeric" maxLength={4} error={errors.sortOrder} hint="Les plus petits nombres s'affichent en premier." onChange={(value) => update("sortOrder", value.replace(/[^\d]/g, ""))} />
            </Card>
            <Card title="Aperçu">
              <div className="adm-stack" style={{ gap: 10 }}>
                {isValidImageReference(draft.image) && (
                  <div className="adm-entity-media" style={{ borderRadius: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image} alt="" />
                  </div>
                )}
                <p style={{ font: "500 22px/1.15 var(--adm-font-display)" }}>{draft.name || "Nom de la boutique"}</p>
                <div className="adm-entity-meta">
                  <span><MapPin aria-hidden />{[draft.address, draft.city, draft.country].filter(Boolean).join(", ") || "Adresse"}</span>
                  <span><Clock aria-hidden /><span style={{ whiteSpace: "pre-line" }}>{draft.openingHours || "Horaires"}</span></span>
                  {draft.phone && <span><Phone aria-hidden />{draft.phone}</span>}
                </div>
              </div>
            </Card>
            {!form.isNew && (
              <Card title="Zone sensible">
                <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" disabled={form.deleting || form.pending} onClick={() => form.remove(form.savedDraft.name)}><Trash2 aria-hidden /> Supprimer la boutique</button>
              </Card>
            )}
          </aside>
        </div>
        <SaveBar dirty={form.dirty} pending={form.pending} isNew={form.isNew} submitLabel={form.isNew ? "Ajouter la boutique" : "Enregistrer"} onDiscard={() => { form.setDraft(form.savedDraft); form.setErrors({}); }} />
      </form>
    </>
  );
}
