"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";

export function ProductAdminActions({ id, name, isActive, canDelete }: { id: string; name: string; isActive: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [running, setRunning] = useState<"" | "toggle" | "delete">("");
  const [refreshing, startTransition] = useTransition();
  const busy = Boolean(running) || refreshing;

  async function toggle() {
    setRunning("toggle");
    const result = await adminRequest(`/api/admin/products/${id}`, { method: "PATCH", json: { isActive: !isActive } });
    setRunning("");
    if (!result.ok) { toast.apiError(result, "Statut inchangé"); return; }
    toast.success(isActive ? `« ${name} » est repassé en brouillon` : `« ${name} » est publié`);
    startTransition(() => router.refresh());
  }

  async function remove() {
    const ok = await confirm({
      title: `Supprimer « ${name} » ?`,
      description: "Le produit et toutes ses variantes seront définitivement supprimés. S'il figure dans une commande, la suppression sera refusée : dépubliez-le plutôt.",
      confirmLabel: "Supprimer définitivement",
      tone: "danger",
    });
    if (!ok) return;
    setRunning("delete");
    const result = await adminRequest(`/api/admin/products/${id}`, { method: "DELETE" });
    setRunning("");
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    toast.success(`« ${name} » a été supprimé`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="adm-row-actions">
      <Link className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" href={`/admin/produits/${id}`} aria-label={`Modifier ${name}`} title="Modifier"><Pencil aria-hidden /></Link>
      <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy} onClick={toggle} aria-busy={running === "toggle" || undefined}>
        {running === "toggle" ? <LoaderCircle className="adm-spin" aria-hidden /> : isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        {isActive ? "Dépublier" : "Publier"}
      </button>
      {canDelete && (
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" disabled={busy} onClick={remove} aria-label={`Supprimer ${name}`} title="Supprimer" style={{ color: "var(--adm-danger)" }}>
          {running === "delete" ? <LoaderCircle className="adm-spin" aria-hidden /> : <Trash2 aria-hidden />}
        </button>
      )}
    </div>
  );
}
