"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

type Asset = { id: string; filename: string; mimeType: string; size: number; createdAt: string };

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export function MediaLibrary({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleFiles(files: FileList) {
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error ?? `Échec du téléversement de ${file.name}.`);
          break;
        }
      }
    } catch {
      setError("Téléversement impossible. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  }

  function copyUrl(id: string) {
    const url = `${window.location.origin}/api/media/${id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(""), 1500);
  }

  function remove(id: string, filename: string) {
    if (!window.confirm(`Supprimer « ${filename} » ? Les pages qui utilisent cette image afficheront une image cassée.`)) return;
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Suppression impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="media-toolbar">
        <button type="button" className="admin-create-button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <><LoaderCircle className="spin" /> Envoi…</> : <><Upload /> Téléverser des images</>}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden onChange={(event) => { if (event.target.files?.length) handleFiles(event.target.files); }} />
        <span className="media-hint">JPEG, PNG, WebP, GIF ou AVIF · 4 Mo max par image</span>
      </div>
      {error && <p className="admin-form-error" style={{ marginBottom: 18 }}>{error}</p>}
      {assets.length === 0 ? (
        <div className="admin-empty">Aucune image téléversée pour le moment. Vos images apparaîtront ici.</div>
      ) : (
        <div className="media-grid">
          {assets.map((asset) => (
            <figure className="media-card" key={asset.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${asset.id}`} alt={asset.filename} loading="lazy" />
              <figcaption>
                <strong title={asset.filename}>{asset.filename}</strong>
                <small>{formatSize(asset.size)}</small>
                <div className="media-card-actions">
                  <button type="button" onClick={() => copyUrl(asset.id)}>{copiedId === asset.id ? <><Check size={13} /> Copiée</> : <><Copy size={13} /> Copier l&apos;URL</>}</button>
                  <button type="button" className="danger" disabled={pending} onClick={() => remove(asset.id, asset.filename)}><Trash2 size={13} /> Supprimer</button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
