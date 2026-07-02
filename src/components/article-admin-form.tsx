"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/image-uploader";

type ArticleDraft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  isPublished: boolean;
};

function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function ArticleAdminForm({ article }: { article?: ArticleDraft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "");
  const [isPublished, setIsPublished] = useState(article?.isPublished ?? false);
  const heading = useMemo(() => article ? `Modifier « ${article.title} »` : "Nouvel article", [article]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!coverImage.trim()) {
      setError("Ajoutez une image de couverture (téléversement ou URL).");
      return;
    }
    const payload = { title, slug, excerpt, content, coverImage, isPublished };

    startTransition(async () => {
      const response = await fetch(article ? `/api/admin/articles/${article.id}` : "/api/admin/articles", {
        method: article ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Enregistrement impossible." }));
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      router.push("/admin/articles");
      router.refresh();
    });
  }

  return <div className="article-form-page">
    <header className="admin-content-header"><div><Link href="/admin/articles"><ArrowLeft /> Articles</Link><h1>{heading}</h1></div></header>
    <form className="product-admin-form" onSubmit={submit}>
      <div className="product-form-main">
        <section className="admin-form-card">
          <h2>Contenu</h2>
          <label>Titre<input value={title} onChange={(event) => { setTitle(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)); }} required minLength={2} maxLength={180} /></label>
          <label>Slug (adresse de la page)<input value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} required /></label>
          <label>Résumé (affiché dans les listes)<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} required minLength={10} maxLength={500} rows={3} /></label>
          <label>Texte de l&apos;article (un paragraphe par ligne vide)<textarea value={content} onChange={(event) => setContent(event.target.value)} required minLength={10} rows={14} /></label>
        </section>
      </div>
      <aside className="product-form-aside">
        <section className="admin-form-card">
          <h2>Publication</h2>
          <label className="publish-toggle"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /><span>{isPublished ? "Publié dans le Journal" : "Brouillon invisible"}</span></label>
        </section>
        <section className="admin-form-card">
          <h2>Image de couverture</h2>
          <ImageUploader value={coverImage} onChange={setCoverImage} />
        </section>
        {error && <p className="admin-form-error">{error}</p>}
        <button className="primary-button" disabled={pending}>{pending ? <><LoaderCircle className="spin" /> Enregistrement…</> : <><Save /> Enregistrer</>}</button>
      </aside>
    </form>
  </div>;
}
