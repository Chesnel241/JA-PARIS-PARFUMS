"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";

// Champ image réutilisable : téléversement direct (stocké en base, servi via
// /api/media/…) ou saisie d'une URL/chemin. Utilisé par les articles,
// l'apparence du site et les produits.
export function ImageUploader({
  value,
  onChange,
  showUrlField = true,
}: {
  value: string;
  onChange: (url: string) => void;
  showUrlField?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Téléversement impossible.");
        return;
      }
      onChange(data.asset.url);
    } catch {
      setError("Téléversement impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="image-uploader">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="image-uploader-preview" src={value} alt="" />
      ) : (
        <div className="image-uploader-preview image-uploader-empty">Aucune image</div>
      )}
      <div className="image-uploader-controls">
        <button type="button" className="image-uploader-button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <><LoaderCircle className="spin" size={14} /> Envoi…</> : <><Upload size={14} /> Téléverser une image</>}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFile(file); }}
        />
        {showUrlField && (
          <input
            type="text"
            className="image-uploader-url"
            value={value}
            placeholder="/image.jpg ou https://…"
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {error && <small className="image-uploader-error">{error}</small>}
      </div>
    </div>
  );
}
