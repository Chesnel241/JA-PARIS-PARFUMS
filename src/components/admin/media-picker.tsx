"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Images, LoaderCircle, X } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { formatBytes } from "@/components/admin/format";
import { useScrollLock } from "@/components/admin/use-scroll-lock";
import { EmptyState } from "@/components/admin/ui";

type Asset = { id: string; filename: string; size: number; createdAt: string };

// Fenêtre « Choisir dans la médiathèque » : réutilise une image déjà téléversée.
export function MediaPicker({ open, onClose, onSelect, multiple = false }: {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  useScrollLock(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setSelected([]);
      setError("");
      setAssets(null);
      adminRequest<{ assets: Asset[] }>("/api/admin/media").then((result) => {
        if (result.ok) setAssets(result.data.assets ?? []);
        else { setError(result.error); setAssets([]); }
      });
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const toggle = (url: string) => {
    setSelected((current) => current.includes(url) ? current.filter((item) => item !== url) : multiple ? [...current, url] : [url]);
  };

  const filtered = (assets ?? []).filter((asset) => asset.filename.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <dialog
      ref={dialogRef}
      className="adm-dialog adm-dialog--wide"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open && (
        <>
          <div className="adm-dialog-bar">
            <h2 className="adm-dialog-title" id={titleId}>Choisir dans la médiathèque</h2>
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--icon" onClick={onClose} aria-label="Fermer"><X aria-hidden /></button>
          </div>
          {assets && assets.length > 6 && (
            <div style={{ padding: "12px 22px 0" }}>
              <label className="adm-sr-only" htmlFor={`${titleId}-q`}>Rechercher une image</label>
              <input id={`${titleId}-q`} className="adm-input" type="search" placeholder="Rechercher par nom de fichier…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          )}
          {assets === null ? (
            <div className="adm-center" style={{ minHeight: 240 }}><LoaderCircle className="adm-spin" aria-label="Chargement des images" /></div>
          ) : error ? (
            <div style={{ padding: 22 }}><div className="adm-alert adm-alert--danger" role="alert">{error}</div></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Images} title={assets.length ? "Aucune image trouvée" : "Médiathèque vide"} description={assets.length ? "Essayez un autre nom de fichier." : "Téléversez d'abord une image : elle sera ensuite réutilisable partout."} />
          ) : (
            <div className="adm-picker-grid" role="group" aria-label="Images disponibles">
              {filtered.map((asset) => {
                const url = `/api/media/${asset.id}`;
                const isSelected = selected.includes(url);
                return (
                  <button key={asset.id} type="button" className="adm-picker-item" aria-pressed={isSelected} onClick={() => toggle(url)} onDoubleClick={() => { if (!multiple) { onSelect([url]); onClose(); } }} title={`${asset.filename} · ${formatBytes(asset.size)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={asset.filename} loading="lazy" decoding="async" />
                    {isSelected && <span className="adm-picker-check" aria-hidden><Check /></span>}
                    <span className="adm-picker-name" aria-hidden>{asset.filename}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="adm-dialog-footer">
            <span className="adm-muted" style={{ fontSize: 13 }}>{selected.length ? `${selected.length} sélectionnée${selected.length > 1 ? "s" : ""}` : multiple ? "Sélectionnez une ou plusieurs images" : "Sélectionnez une image"}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" className="adm-btn adm-btn--secondary" onClick={onClose}>Annuler</button>
              <button type="button" className="adm-btn adm-btn--primary" disabled={!selected.length} onClick={() => { onSelect(selected); onClose(); }}>Utiliser {multiple && selected.length > 1 ? "ces images" : "cette image"}</button>
            </span>
          </div>
        </>
      )}
    </dialog>
  );
}
