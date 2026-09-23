"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { adminRequest, isValidImageReference, type FieldErrors } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { SaveBar, Switch, TextAreaField, TextField, focusFirstInvalid, useUnsavedChanges } from "@/components/admin/form";
import { slugify } from "@/components/admin/format";
import { useToast } from "@/components/admin/toast";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ImageUploader } from "@/components/image-uploader";

type ArticleDraft = { title: string; slug: string; excerpt: string; content: string; coverImage: string; isPublished: boolean };
type ArticleInput = ArticleDraft & { id?: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validate(draft: ArticleDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.title.trim().length < 2) errors.title = "Le titre doit contenir au moins 2 caractères.";
  if (draft.slug.length < 2 || !SLUG_PATTERN.test(draft.slug)) errors.slug = "Uniquement des lettres minuscules, chiffres et tirets.";
  if (draft.excerpt.trim().length < 10) errors.excerpt = "10 caractères minimum.";
  if (draft.content.trim().length < 10) errors.content = "10 caractères minimum.";
  if (!isValidImageReference(draft.coverImage)) errors.coverImage = "Ajoutez une image de couverture.";
  return errors;
}

export function ArticleAdminForm({ article }: { article?: ArticleInput }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const isNew = !article?.id;
  const initial: ArticleDraft = {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    content: article?.content ?? "",
    coverImage: article?.coverImage ?? "",
    isPublished: article?.isPublished ?? false,
  };
  const [draft, setDraft] = useState<ArticleDraft>(initial);
  const [savedDraft, setSavedDraft] = useState<ArticleDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  useUnsavedChanges(dirty && !pending);

  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 220));

  function update<K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("L'article n'est pas enregistré", "Corrigez les champs signalés en rouge.");
      focusFirstInvalid(formRef.current);
      return;
    }
    setPending(true);
    const payload = { ...draft, title: draft.title.trim(), excerpt: draft.excerpt.trim(), content: draft.content.trim(), coverImage: draft.coverImage.trim() };
    const result = await adminRequest<{ article: { id: string } }>(isNew ? "/api/admin/articles" : `/api/admin/articles/${article?.id}`, { method: isNew ? "POST" : "PUT", json: payload });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      if (result.status === 409) setErrors((current) => ({ ...current, slug: result.error }));
      toast.apiError(result, "L'article n'est pas enregistré");
      focusFirstInvalid(formRef.current);
      return;
    }
    setSavedDraft(draft);
    if (isNew) {
      toast.success("Article créé", draft.isPublished ? "Il est en ligne dans le Journal." : "Il est enregistré en brouillon.");
      router.replace(`/admin/articles/${result.data.article.id}`);
    } else {
      toast.success("Article enregistré");
    }
    router.refresh();
  }

  async function remove() {
    if (!article?.id) return;
    const ok = await confirm({ title: `Supprimer « ${article.title} » ?`, description: "L'article sera définitivement supprimé du Journal.", confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return;
    setDeleting(true);
    const result = await adminRequest(`/api/admin/articles/${article.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    setSavedDraft(draft);
    toast.success("Article supprimé");
    router.replace("/admin/articles");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/articles", label: "Journal" }}
        title={isNew ? "Nouvel article" : draft.title || "Article"}
        meta={!isNew ? <Badge tone={draft.isPublished ? "success" : "neutral"}>{draft.isPublished ? "Publié" : "Brouillon"}</Badge> : undefined}
        actions={!isNew && article?.isPublished ? <a className="adm-btn adm-btn--secondary" href={`/journal/${article.slug}`} target="_blank" rel="noopener"><ExternalLink aria-hidden /> Voir l&apos;article</a> : undefined}
      />
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="adm-form-layout">
          <div className="adm-form-main">
            <Card title="Contenu">
              <TextField id="article-title" label="Titre" required value={draft.title} maxLength={180} error={errors.title} placeholder="Ex. Les secrets de fabrication de nos parfums"
                onChange={(value) => { update("title", value); if (!slugTouched) update("slug", slugify(value)); }} />
              <TextField id="article-slug" label="Adresse de la page" required value={draft.slug} maxLength={180} error={errors.slug} prefix="/journal/"
                hint="Générée depuis le titre."
                onChange={(value) => { setSlugTouched(true); update("slug", slugify(value)); }} />
              <TextAreaField id="article-excerpt" label="Résumé" required rows={3} value={draft.excerpt} maxLength={500} showCount error={errors.excerpt}
                hint="Affiché dans la liste du Journal et sur l'accueil."
                onChange={(value) => update("excerpt", value)} />
              <TextAreaField id="article-content" label="Texte de l'article" required rows={16} value={draft.content} maxLength={50000} error={errors.content}
                hint={`Laissez une ligne vide entre deux paragraphes · ${words} mot${words > 1 ? "s" : ""} · environ ${minutes} min de lecture`}
                onChange={(value) => update("content", value)} />
            </Card>
          </div>
          <aside className="adm-form-aside" aria-label="Publication et couverture">
            <Card title="Publication">
              <Switch id="article-published" checked={draft.isPublished} onChange={(value) => update("isPublished", value)}
                label={draft.isPublished ? "Publié dans le Journal" : "Brouillon"}
                description={draft.isPublished ? "Visible par tous les visiteurs." : "Invisible tant qu'il n'est pas publié."} />
            </Card>
            <Card title="Image de couverture" description="Format paysage conseillé (4:3).">
              <div id="article-cover" tabIndex={-1} aria-invalid={errors.coverImage ? true : undefined}>
                <ImageUploader id="article-cover-field" value={draft.coverImage} onChange={(value) => update("coverImage", value)} error={errors.coverImage} aspectRatio="4 / 3" label="image de couverture" />
              </div>
            </Card>
            {!isNew && (
              <Card title="Zone sensible">
                <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" onClick={remove} disabled={deleting || pending}><Trash2 aria-hidden /> Supprimer l&apos;article</button>
              </Card>
            )}
          </aside>
        </div>
        <SaveBar dirty={dirty} pending={pending} isNew={isNew} submitLabel={isNew ? "Créer l'article" : "Enregistrer"} onDiscard={() => { setDraft(savedDraft); setErrors({}); }} />
      </form>
    </>
  );
}
