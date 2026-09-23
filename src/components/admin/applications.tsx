"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, SearchX, Trash2 } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { csvFilename, downloadCsv } from "@/components/admin/csv";
import { formatCsvDate, formatDate, instagramHandle } from "@/components/admin/format";
import { APPLICATION_STATUS, APPLICATION_STATUS_ORDER } from "@/components/admin/labels";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { useToast } from "@/components/admin/toast";
import { Badge, EmptyState } from "@/components/admin/ui";

export type ApplicationItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  message: string;
  status: string;
  createdAt: string;
};

export function useApplicationMutations() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState("");
  const [, startTransition] = useTransition();

  async function setStatus(item: Pick<ApplicationItem, "id" | "firstName" | "lastName">, status: string) {
    setBusyId(item.id);
    const result = await adminRequest(`/api/admin/applications/${item.id}`, { method: "PATCH", json: { status } });
    setBusyId("");
    if (!result.ok) { toast.apiError(result, "Statut inchangé"); return false; }
    toast.success(`Candidature de ${item.firstName} ${item.lastName} : ${APPLICATION_STATUS[status]?.label.toLowerCase() ?? status}`);
    startTransition(() => router.refresh());
    return true;
  }

  async function remove(item: Pick<ApplicationItem, "id" | "firstName" | "lastName">, redirectTo?: string) {
    const ok = await confirm({ title: `Supprimer la candidature de ${item.firstName} ${item.lastName} ?`, description: "Le message et les coordonnées seront définitivement effacés.", confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return false;
    setBusyId(item.id);
    const result = await adminRequest(`/api/admin/applications/${item.id}`, { method: "DELETE" });
    setBusyId("");
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return false; }
    toast.success("Candidature supprimée");
    if (redirectTo) router.replace(redirectTo);
    startTransition(() => router.refresh());
    return true;
  }

  return { busyId, setStatus, remove };
}

export function StatusSelect({ item, onChange, disabled, id }: { item: ApplicationItem | { id: string; status: string; firstName: string; lastName: string }; onChange: (status: string) => void; disabled?: boolean; id?: string }) {
  return (
    <>
      <label className="adm-sr-only" htmlFor={id ?? `status-${item.id}`}>Statut de la candidature de {item.firstName} {item.lastName}</label>
      <select id={id ?? `status-${item.id}`} className="adm-input" style={{ width: "auto", minWidth: 150 }} value={item.status} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {APPLICATION_STATUS_ORDER.map((status) => <option key={status} value={status}>{APPLICATION_STATUS[status].label}</option>)}
      </select>
    </>
  );
}

export function exportApplications(items: ApplicationItem[]) {
  downloadCsv(
    csvFilename("candidatures-ambassadrices"),
    ["Date", "Prénom", "Nom", "E-mail", "Téléphone", "Instagram", "Ville", "Statut", "Message"],
    items.map((item) => [formatCsvDate(item.createdAt), item.firstName, item.lastName, item.email, item.phone ?? "", item.instagram ?? "", item.city ?? "", APPLICATION_STATUS[item.status]?.label ?? item.status, item.message]),
  );
}

export function ApplicationsTable({ items, statusLabel }: { items: ApplicationItem[]; statusLabel: string }) {
  const { busyId, setStatus, remove } = useApplicationMutations();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return q ? items.filter((item) => normalizeSearch(`${item.firstName} ${item.lastName} ${item.email} ${item.city ?? ""} ${item.instagram ?? ""}`).includes(q)) : items;
  }, [items, query]);

  return (
    <div className="adm-card adm-card--flush">
      <div className="adm-toolbar">
        <LocalSearchField id="application-search" label="Rechercher une candidature" placeholder="Nom, e-mail, ville, Instagram…" value={query} onChange={setQuery} />
        <button type="button" className="adm-btn adm-btn--secondary" disabled={!visible.length} onClick={() => { exportApplications(visible); toast.success(`${visible.length} candidature${visible.length > 1 ? "s" : ""} exportée${visible.length > 1 ? "s" : ""}`, "Fichier CSV compatible Excel."); }}>
          <Download aria-hidden /> Exporter en CSV
        </button>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title={items.length ? "Aucun résultat" : `Aucune candidature ${statusLabel}`} description={items.length ? "Modifiez votre recherche." : "Les candidatures envoyées depuis le formulaire « Devenir ambassadrice » arrivent ici."} />
      ) : (
        <table className="adm-table">
          <caption className="adm-sr-only">Candidatures</caption>
          <thead><tr><th scope="col">Candidate</th><th scope="col">Ville</th><th scope="col">Reçue le</th><th scope="col">Statut</th><th scope="col"><span className="adm-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} data-clickable>
                <td className="adm-td-primary">
                  <div className="adm-cell-main-text">
                    <Link className="adm-row-link adm-cell-title" href={`/admin/candidatures/${item.id}`}>{item.firstName} {item.lastName}</Link>
                    <span className="adm-cell-sub">{item.email}{item.instagram ? ` · ${instagramHandle(item.instagram)}` : ""}</span>
                  </div>
                </td>
                <td data-label="Ville"><span className="adm-cell-sub">{item.city || "—"}</span></td>
                <td data-label="Reçue le"><span className="adm-cell-sub adm-nowrap">{formatDate(item.createdAt)}</span></td>
                <td className="adm-td-aside"><Badge tone={APPLICATION_STATUS[item.status]?.tone}>{APPLICATION_STATUS[item.status]?.label ?? item.status}</Badge></td>
                <td className="adm-td-actions">
                  <div className="adm-row-actions">
                    <StatusSelect item={item} disabled={busyId === item.id} onChange={(status) => void setStatus(item, status)} />
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" style={{ color: "var(--adm-danger)" }} disabled={busyId === item.id} onClick={() => void remove(item)} aria-label={`Supprimer la candidature de ${item.firstName} ${item.lastName}`} title="Supprimer">
                      {busyId === item.id ? <LoaderCircle className="adm-spin" aria-hidden /> : <Trash2 aria-hidden />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ApplicationDetailActions({ item }: { item: ApplicationItem }) {
  const { busyId, setStatus, remove } = useApplicationMutations();
  const busy = busyId === item.id;
  const subject = encodeURIComponent("Votre candidature ambassadrice JAE Paris");
  return (
    <div className="adm-stack">
      <div className="adm-field">
        <label className="adm-label" htmlFor="application-status">Statut</label>
        <StatusSelect id="application-status" item={item} disabled={busy} onChange={(status) => void setStatus(item, status)} />
      </div>
      <a className="adm-btn adm-btn--primary adm-btn--block" href={`mailto:${item.email}?subject=${subject}`}
        onClick={() => { if (item.status === "NEW") void setStatus(item, "CONTACTED"); }}>
        Répondre par e-mail
      </a>
      {item.status === "NEW" && <p className="adm-hint">Répondre par e-mail marque automatiquement la candidature comme « Contactée ».</p>}
      <button type="button" className="adm-btn adm-btn--danger-ghost adm-btn--block" disabled={busy} onClick={() => void remove(item, "/admin/candidatures")}>
        {busy ? <LoaderCircle className="adm-spin" aria-hidden /> : <Trash2 aria-hidden />} Supprimer la candidature
      </button>
    </div>
  );
}
