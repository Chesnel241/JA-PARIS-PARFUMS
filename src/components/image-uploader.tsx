"use client";

import { useId, useRef, useState } from "react";
import { CircleAlert, ImagePlus, Images, LoaderCircle, Trash2, Upload } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, isValidImageReference, uploadImage } from "@/components/admin/api";
import { MediaPicker } from "@/components/admin/media-picker";

// Champ image réutilisable : glisser-déposer, téléversement, choix dans la
// médiathèque ou adresse web. Utilisé par les articles, l'apparence,
// les ambassadrices et les boutiques.
export function ImageUploader({
  value,
  onChange,
  showUrlField = true,
  id,
  error,
  aspectRatio = "16 / 10",
  fit = "cover",
  preview,
  label = "image",
}: {
  value: string;
  onChange: (url: string) => void;
  showUrlField?: boolean;
  id?: string;
  error?: string;
  aspectRatio?: string;
  fit?: "cover" | "contain";
  // Aperçu personnalisé (ex. rendu fidèle d'un emplacement du site).
  preview?: React.ReactNode;
  label?: string;
}) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const urlInvalid = value.trim() !== "" && !isValidImageReference(value);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const result = await uploadImage(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    onChange(result.data.url);
  }

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } },
    onDragLeave: () => setDragging(false),
    onDrop: (event: React.DragEvent) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files?.[0]); },
  };

  const shownError = uploadError || error || (urlInvalid ? "L'adresse doit commencer par / ou https://." : "");

  return (
    <div className="adm-image-field">
      {value && !urlInvalid ? (
        <div className={`adm-image-preview ${dragging ? "is-dragging" : ""}`} style={preview ? undefined : { aspectRatio }} {...dropHandlers}>
          {preview ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`Aperçu de l'${label}`} style={{ objectFit: fit }} />
          )}
          {(uploading || dragging) && <div className="adm-image-preview-overlay">{uploading ? <><LoaderCircle className="adm-spin" aria-hidden /> Envoi…</> : "Déposer pour remplacer"}</div>}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          className={`adm-dropzone ${dragging ? "is-dragging" : ""}`}
          aria-disabled={uploading || undefined}
          aria-describedby={shownError ? `${fieldId}-error` : undefined}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !uploading) { event.preventDefault(); inputRef.current?.click(); } }}
          {...dropHandlers}
        >
          {uploading ? <LoaderCircle className="adm-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          <strong>{uploading ? "Envoi en cours…" : "Glissez une image ici ou cliquez pour choisir"}</strong>
          <small>JPEG, PNG, WebP, GIF ou AVIF · 4 Mo max.</small>
        </div>
      )}

      <div className="adm-image-actions">
        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <LoaderCircle className="adm-spin" aria-hidden /> : <Upload aria-hidden />} {value ? "Remplacer" : "Téléverser"}
        </button>
        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={uploading} onClick={() => setPickerOpen(true)}>
          <Images aria-hidden /> Médiathèque
        </button>
        {value && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={uploading} onClick={() => onChange("")}>
            <Trash2 aria-hidden /> Retirer
          </button>
        )}
      </div>
      <input ref={inputRef} id={`${fieldId}-file`} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} hidden onChange={(event) => void handleFile(event.target.files?.[0])} />

      {showUrlField && (
        <details className="adm-image-url" open={value.trim() !== "" && !value.startsWith("/api/media/") && urlInvalid}>
          <summary>Utiliser une adresse web</summary>
          <label className="adm-sr-only" htmlFor={`${fieldId}-url`}>Adresse de l&apos;{label}</label>
          <input
            id={`${fieldId}-url`}
            type="text"
            inputMode="url"
            className="adm-input"
            value={value}
            placeholder="/image.jpg ou https://…"
            aria-invalid={urlInvalid || undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        </details>
      )}

      {shownError && <p className="adm-error" id={`${fieldId}-error`} role="alert"><CircleAlert aria-hidden />{shownError}</p>}

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(urls) => { if (urls[0]) { setUploadError(""); onChange(urls[0]); } }} />
    </div>
  );
}
