"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Plus, Star, Trash2, Upload } from "lucide-react";

// Gestionnaire visuel des images d'un produit : téléversement (stocké en base,
// servi via /api/media), aperçu en vignettes, suppression, ajout par URL,
// réordonnancement simple. La première image est l'image principale.
export function ProductImagesField({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFiles(files: FileList) {
    setError("");
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { setError(data.error ?? "Téléversement impossible."); break; }
        added.push(data.asset.url);
      }
      if (added.length) onChange([...images, ...added]);
    } catch {
      setError("Téléversement impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.unshift(moved);
    onChange(next);
  }

  function addUrl() {
    const value = urlDraft.trim();
    if (!value) return;
    onChange([...images, value]);
    setUrlDraft("");
  }

  return (
    <div className="product-images-field">
      {images.length > 0 && (
        <div className="product-images-grid">
          {images.map((src, index) => (
            <figure className="product-image-thumb" key={`${src}-${index}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
              {index === 0 && <span className="product-image-badge"><Star size={11} fill="currentColor" /> Principale</span>}
              <div className="product-image-thumb-actions">
                {index !== 0 && <button type="button" title="Définir comme principale" onClick={() => makePrimary(index)}><Star size={13} /></button>}
                <button type="button" className="danger" title="Retirer" onClick={() => removeAt(index)}><Trash2 size={13} /></button>
              </div>
            </figure>
          ))}
        </div>
      )}

      <button type="button" className="product-images-drop" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <><LoaderCircle className="spin" size={18} /> Téléversement…</> : <><Upload size={18} /> Téléverser une ou plusieurs images</>}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden onChange={(event) => { if (event.target.files?.length) handleFiles(event.target.files); }} />

      <div className="product-images-url">
        <input type="text" value={urlDraft} placeholder="…ou coller une adresse (/image.jpg ou https://…)" onChange={(event) => setUrlDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }} />
        <button type="button" onClick={addUrl}><Plus size={14} /> Ajouter</button>
      </div>

      <p className="product-images-hint">JPEG, PNG, WebP, GIF ou AVIF · 4 Mo max. La première image est affichée en principale.</p>
      {error && <p className="admin-form-error">{error}</p>}
    </div>
  );
}
