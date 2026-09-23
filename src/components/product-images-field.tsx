"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, ImagePlus, Images, Link2, LoaderCircle, Plus, Star, Trash2 } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, isValidImageReference, uploadImage } from "@/components/admin/api";
import { MediaPicker } from "@/components/admin/media-picker";

const MAX_IMAGES = 12;

// Galerie d'un produit : glisser-déposer de fichiers, réorganisation par
// glisser-déposer (ou flèches, au clavier et au doigt), image principale,
// médiathèque et ajout par adresse. La première image est la principale.
export function ProductImagesField({ images, onChange, error, id = "product-images" }: {
  images: string[];
  onChange: (next: string[]) => void;
  error?: string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [filesOver, setFilesOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const remaining = MAX_IMAGES - images.length;

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).slice(0, Math.max(0, remaining));
    setUploadError(Array.from(fileList).length > files.length ? `${MAX_IMAGES} images maximum par produit.` : "");
    if (!files.length) return;
    setUploading(files.length);
    const added: string[] = [];
    const problems: string[] = [];
    for (const file of files) {
      const result = await uploadImage(file);
      if (result.ok) added.push(result.data.url); else problems.push(result.error);
      setUploading((count) => count - 1);
    }
    if (added.length) {
      onChange([...images, ...added]);
      setAnnounce(`${added.length} image${added.length > 1 ? "s" : ""} ajoutée${added.length > 1 ? "s" : ""}.`);
    }
    if (problems.length) setUploadError(problems.join(" "));
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setAnnounce(to === 0 ? "Image définie comme principale." : `Image déplacée en position ${to + 1}.`);
  }

  function addUrl() {
    const value = urlDraft.trim();
    if (!value) return;
    if (!isValidImageReference(value)) { setUrlError("L'adresse doit commencer par / ou https://."); return; }
    if (remaining <= 0) { setUrlError(`${MAX_IMAGES} images maximum.`); return; }
    onChange([...images, value]);
    setUrlDraft("");
    setUrlError("");
  }

  const shownError = uploadError || error;

  return (
    <div className="adm-image-field" id={id} tabIndex={-1} aria-invalid={error ? true : undefined}>
      <p className="adm-sr-only" aria-live="polite">{announce}</p>
      {images.length > 0 && (
        <ul className="adm-gallery" aria-label="Images du produit (la première est l'image principale)">
          {images.map((src, index) => (
            <li
              key={`${src}-${index}`}
              className={`adm-gallery-item ${dragIndex === index ? "is-dragging" : ""} ${overIndex === index && dragIndex !== index ? "is-over" : ""}`}
              draggable
              onDragStart={(event) => { setDragIndex(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }}
              onDragOver={(event) => { if (dragIndex !== null) { event.preventDefault(); setOverIndex(index); } }}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => { if (dragIndex !== null) { event.preventDefault(); event.stopPropagation(); move(dragIndex, index); } setDragIndex(null); setOverIndex(null); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Image ${index + 1}${index === 0 ? " (principale)" : ""}`} loading="lazy" />
              {index === 0 && <span className="adm-gallery-main"><Star fill="currentColor" aria-hidden /> Principale</span>}
              <div className="adm-gallery-tools">
                {index !== 0 && <button type="button" onClick={() => move(index, 0)} aria-label={`Définir l'image ${index + 1} comme principale`} title="Définir comme principale"><Star aria-hidden /></button>}
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Déplacer l'image ${index + 1} vers la gauche`} title="Déplacer avant"><ArrowLeft aria-hidden /></button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === images.length - 1} aria-label={`Déplacer l'image ${index + 1} vers la droite`} title="Déplacer après"><ArrowRight aria-hidden /></button>
                <button type="button" className="is-danger" onClick={() => { onChange(images.filter((_, i) => i !== index)); setAnnounce("Image retirée."); }} aria-label={`Retirer l'image ${index + 1}`} title="Retirer"><Trash2 aria-hidden /></button>
              </div>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, index) => (
            <li key={`uploading-${index}`} className="adm-gallery-uploading"><LoaderCircle className="adm-spin" aria-label="Envoi en cours" /></li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div
          role="button"
          tabIndex={0}
          className={`adm-dropzone ${images.length ? "adm-dropzone--compact" : ""} ${filesOver ? "is-dragging" : ""}`}
          aria-disabled={uploading > 0 || undefined}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !uploading) { event.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setFilesOver(true); } }}
          onDragLeave={() => setFilesOver(false)}
          onDrop={(event) => { event.preventDefault(); setFilesOver(false); if (event.dataTransfer.files?.length) void handleFiles(event.dataTransfer.files); }}
        >
          {uploading ? <LoaderCircle className="adm-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          <strong>{uploading ? `Envoi de ${uploading} image${uploading > 1 ? "s" : ""}…` : "Glissez vos images ici ou cliquez pour choisir"}</strong>
          <small>Plusieurs fichiers possibles · JPEG, PNG, WebP, GIF, AVIF · 4 Mo max. chacun</small>
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={(event) => { if (event.target.files?.length) void handleFiles(event.target.files); }} />

      <div className="adm-image-actions">
        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => setPickerOpen(true)} disabled={remaining <= 0}><Images aria-hidden /> Choisir dans la médiathèque</button>
      </div>

      <details className="adm-image-url">
        <summary><Link2 aria-hidden style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px" }} /> Ajouter par adresse web</summary>
        <div style={{ display: "flex", gap: 8 }}>
          <label className="adm-sr-only" htmlFor={`${id}-url`}>Adresse de l&apos;image</label>
          <input id={`${id}-url`} className="adm-input" type="text" inputMode="url" value={urlDraft} placeholder="/image.jpg ou https://…" aria-invalid={urlError ? true : undefined}
            onChange={(event) => { setUrlDraft(event.target.value); setUrlError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }} />
          <button type="button" className="adm-btn adm-btn--secondary" onClick={addUrl}><Plus aria-hidden /> Ajouter</button>
        </div>
        {urlError && <p className="adm-error"><CircleAlert aria-hidden />{urlError}</p>}
      </details>

      <p className="adm-hint">{images.length} / {MAX_IMAGES} images · glissez les vignettes pour les réordonner, la première est affichée en principale.</p>
      {shownError && <p className="adm-error" role="alert"><CircleAlert aria-hidden />{shownError}</p>}

      <MediaPicker multiple open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(urls) => onChange([...images, ...urls.filter((url) => !images.includes(url))].slice(0, MAX_IMAGES))} />
    </div>
  );
}
