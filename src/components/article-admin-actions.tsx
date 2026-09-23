"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";

export function ArticleAdminActions({ id, title, isPublished }: { id: string; title: string; isPublished: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [running, setRunning] = useState<"" | "toggle" | "delete">("");
  const [refreshing, startTransition] = useTransition();
  const busy = Boolean(running) || refreshing;

  async function toggle() {
    setRunning("toggle");
    const result = await adminRequest(`/api/admin/articles/${id}`, { method: "PATCH", json: { isPublished: !isPublished } });
    setRunning("");
    if (!result.ok) { toast.apiError(result, "Statut inchangé"); return; }
    toast.success(isPublished ? "Article repassé en brouillon" : "Article publié dans le Journal");
    startTransition(() => router.refresh());
  }

  async function remove() {
    const ok = await confirm({ title: `Supprimer « ${title} » ?`, description: "L'article sera définitivement supprimé du Journal.", confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return;
    setRunning("delete");
    const result = await adminRequest(`/api/admin/articles/${id}`, { method: "DELETE" });
    setRunning("");
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    toast.success("Article supprimé");
    startTransition(() => router.refresh());
  }

  return (
    <div className="adm-row-actions">
      <Link className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" href={`/admin/articles/${id}`} aria-label={`Modifier ${title}`} title="Modifier"><Pencil aria-hidden /></Link>
      <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy} onClick={toggle}>
        {running === "toggle" ? <LoaderCircle className="adm-spin" aria-hidden /> : isPublished ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        {isPublished ? "Dépublier" : "Publier"}
      </button>
      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" disabled={busy} onClick={remove} aria-label={`Supprimer ${title}`} title="Supprimer" style={{ color: "var(--adm-danger)" }}>
        {running === "delete" ? <LoaderCircle className="adm-spin" aria-hidden /> : <Trash2 aria-hidden />}
      </button>
    </div>
  );
}
