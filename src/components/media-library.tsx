"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImagePlus, Images, LoaderCircle, SearchX, Trash2 } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, adminRequest, uploadImage } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { CopyButton } from "@/components/admin/copy-button";
import { formatBytes, formatDate } from "@/components/admin/format";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { useToast } from "@/components/admin/toast";
import { EmptyState } from "@/components/admin/ui";

type Asset = { id: string; filename: string; mimeType: string; size: number; createdAt: string };

export function MediaLibrary({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return q ? assets.filter((asset) => normalizeSearch(asset.filename).includes(q)) : assets;
  }, [assets, query]);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading({ done: 0, total: files.length });
    let success = 0;
    const problems: string[] = [];
    for (const file of files) {
      const result = await uploadImage(file);
      if (result.ok) success += 1;
      else if (result.sessionExpired) { toast.apiError(result); break; }
      else problems.push(result.error);
      setUploading((current) => (current ? { ...current, done: current.done + 1 } : current));
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    if (success) toast.success(success > 1 ? `${success} images téléversées` : "Image téléversée");
    if (problems.length) toast.error(`${problems.length} fichier${problems.length > 1 ? "s" : ""} refusé${problems.length > 1 ? "s" : ""}`, problems.join(" "));
    startTransition(() => router.refresh());
  }

  async function remove(asset: Asset) {
    const ok = await confirm({
      title: `Supprimer « ${asset.filename} » ?`,
      description: "Si cette image est encore utilisée (produit, article, accueil…), elle n'y apparaîtra plus. Cette action est définitive.",
      confirmLabel: "Supprimer l'image",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(asset.id);
    const result = await adminRequest(`/api/admin/media/${asset.id}`, { method: "DELETE" });
    setDeletingId("");
    if (!result.ok) {
      // 409 : l'API signale que le média est encore utilisé.
      toast.apiError(result, result.status === 409 ? "Image encore utilisée" : "Suppression impossible");
      return;
    }
    toast.success("Image supprimée");
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="adm-stack-lg"
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files?.length) void handleFiles(event.dataTransfer.files); }}
    >
      <div
        role="button"
        tabIndex={0}
        className={`adm-dropzone ${dragging ? "is-dragging" : ""}`}
        aria-disabled={uploading ? true : undefined}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !uploading) { event.preventDefault(); inputRef.current?.click(); } }}
      >
        {uploading ? <LoaderCircle className="adm-spin" aria-hidden /> : <ImagePlus aria-hidden />}
        <strong aria-live="polite">{uploading ? `Envoi ${Math.min(uploading.done + 1, uploading.total)} sur ${uploading.total}…` : "Glissez vos images ici ou cliquez pour les choisir"}</strong>
        <small>Plusieurs fichiers à la fois · JPEG, PNG, WebP, GIF ou AVIF · 4 Mo max. par image</small>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={(event) => { if (event.target.files?.length) void handleFiles(event.target.files); }} />

      {assets.length === 0 ? (
        <div className="adm-card"><EmptyState icon={Images} title="Aucune image pour le moment" description="Les images téléversées ici (ou depuis un produit, un article…) sont réutilisables partout sur le site." /></div>
      ) : (
        <section aria-label="Images de la médiathèque" className="adm-stack">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <LocalSearchField id="media-search" label="Rechercher une image" placeholder="Rechercher par nom de fichier…" value={query} onChange={setQuery} />
            <span className="adm-toolbar-meta" aria-live="polite">{visible.length} image{visible.length > 1 ? "s" : ""}</span>
          </div>
          {visible.length === 0 ? (
            <div className="adm-card"><EmptyState icon={SearchX} title="Aucune image trouvée" description="Essayez un autre nom de fichier." /></div>
          ) : (
            <ul className="adm-media-grid">
              {visible.map((asset) => {
                const path = `/api/media/${asset.id}`;
                return (
                  <li className="adm-media-card" key={asset.id}>
                    <a className="adm-media-card-img" href={path} target="_blank" rel="noopener" aria-label={`Ouvrir ${asset.filename} en taille réelle (nouvel onglet)`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={path} alt="" loading="lazy" decoding="async" />
                    </a>
                    <div className="adm-media-card-body">
                      <strong title={asset.filename}>{asset.filename}</strong>
                      <span>{formatBytes(asset.size)} · {formatDate(asset.createdAt)}</span>
                      <div className="adm-media-card-actions">
                        <CopyButton text={`${origin}${path}`} label="Copier l'URL" successMessage="Adresse de l'image copiée" />
                        <a className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" href={path} target="_blank" rel="noopener" aria-label={`Ouvrir ${asset.filename}`} title="Ouvrir"><ExternalLink aria-hidden /></a>
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" style={{ color: "var(--adm-danger)" }} disabled={deletingId === asset.id} onClick={() => remove(asset)} aria-label={`Supprimer ${asset.filename}`} title="Supprimer">
                          {deletingId === asset.id ? <LoaderCircle className="adm-spin" aria-hidden /> : <Trash2 aria-hidden />}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
