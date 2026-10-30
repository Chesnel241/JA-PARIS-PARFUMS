"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Check, Download, RotateCcw, SearchX, Trash2 } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { CopyButton } from "@/components/admin/copy-button";
import { csvFilename, downloadCsv } from "@/components/admin/csv";
import { formatCsvDate, formatDateTime } from "@/components/admin/format";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { useToast } from "@/components/admin/toast";
import { Badge, EmptyState } from "@/components/admin/ui";

export type StockAlertRow = {
  id: string;
  email: string;
  volume: string;
  stock: number;
  createdAt: string;
  notifiedAt: string | null;
  product: { id: string; name: string; slug: string };
};

type Filter = "todo" | "waiting" | "done" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todo", label: "À prévenir" },
  { value: "waiting", label: "En attente du stock" },
  { value: "done", label: "Prévenues" },
  { value: "all", label: "Toutes" },
];

function statusOf(alert: StockAlertRow): Exclude<Filter, "all"> {
  if (alert.notifiedAt) return "done";
  return alert.stock > 0 ? "todo" : "waiting";
}

export function StockAlertsTable({ alerts }: { alerts: StockAlertRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(() => (alerts.some((alert) => statusOf(alert) === "todo") ? "todo" : "all"));
  const [busy, setBusy] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return alerts.filter((alert) => (filter === "all" || statusOf(alert) === filter) && (!q || `${alert.email} ${alert.product.name}`.toLowerCase().includes(q)));
  }, [alerts, filter, query]);

  async function setNotified(alert: StockAlertRow, notified: boolean) {
    setBusy(alert.id);
    const result = await adminRequest(`/api/admin/stock-alerts/${alert.id}`, { method: "PATCH", json: { notified } });
    setBusy(null);
    if (!result.ok) { toast.apiError(result, "Mise à jour impossible"); return; }
    toast.success(notified ? "Alerte marquée comme prévenue" : "Alerte réarmée");
    router.refresh();
  }

  async function remove(alert: StockAlertRow) {
    const ok = await confirm({ title: "Supprimer cette alerte ?", description: `${alert.email} ne sera plus listée pour ${alert.product.name} ${alert.volume}.`, confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return;
    setBusy(alert.id);
    const result = await adminRequest(`/api/admin/stock-alerts/${alert.id}`, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    toast.success("Alerte supprimée");
    router.refresh();
  }

  if (alerts.length === 0) {
    return <div className="adm-card"><EmptyState icon={BellRing} title="Aucune alerte pour le moment" description="Quand une contenance est épuisée, les clientes peuvent demander à être prévenues de son retour depuis la fiche produit." /></div>;
  }

  return (
    <div className="adm-card adm-card--flush">
      <div className="adm-toolbar">
        <LocalSearchField id="alerts-search" label="Rechercher" placeholder="Rechercher une adresse ou un produit…" value={query} onChange={setQuery} />
        <div className="adm-segmented" role="radiogroup" aria-label="Filtrer les alertes">
          {FILTERS.map((option) => (
            <label key={option.value}>
              <input type="radio" name="alerts-filter" value={option.value} checked={filter === option.value} onChange={() => setFilter(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <CopyButton className="adm-btn adm-btn--secondary" text={[...new Set(visible.map((alert) => alert.email))].join(", ")} label="Copier les adresses" successMessage="Adresses copiées (à coller en Cci)" />
        <button type="button" className="adm-btn adm-btn--primary" disabled={!visible.length} onClick={() => {
          downloadCsv(csvFilename("alertes-retour-jae"), ["E-mail", "Produit", "Contenance", "Stock actuel", "Demande", "Prévenue le"], visible.map((alert) => [alert.email, alert.product.name, alert.volume, String(alert.stock), formatCsvDate(alert.createdAt), alert.notifiedAt ? formatCsvDate(alert.notifiedAt) : ""]));
          toast.success(`${visible.length} alerte${visible.length > 1 ? "s" : ""} exportée${visible.length > 1 ? "s" : ""}`, "Fichier CSV compatible Excel.");
        }}>
          <Download aria-hidden /> Exporter en CSV
        </button>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucune alerte dans cette vue" description="Changez de filtre ou de recherche." />
      ) : (
        <table className="adm-table">
          <caption className="adm-sr-only">Alertes de retour en stock</caption>
          <thead><tr><th scope="col">Cliente</th><th scope="col">Produit</th><th scope="col">Statut</th><th scope="col">Demande</th><th scope="col"><span className="adm-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {visible.map((alert) => {
              const status = statusOf(alert);
              return (
                <tr key={alert.id}>
                  <td className="adm-td-primary"><a className="adm-cell-title adm-break" href={`mailto:${alert.email}`} style={{ whiteSpace: "normal" }}>{alert.email}</a></td>
                  <td data-label="Produit"><Link className="adm-cell-title" href={`/admin/produits/${alert.product.id}`}>{alert.product.name}</Link><span className="adm-cell-sub"> · {alert.volume}</span></td>
                  <td data-label="Statut">
                    {status === "todo" ? <Badge tone="warning">À prévenir · {alert.stock} en stock</Badge> : status === "waiting" ? <Badge tone="neutral">Toujours épuisé</Badge> : <Badge tone="success">Prévenue le {formatDateTime(alert.notifiedAt as string)}</Badge>}
                  </td>
                  <td data-label="Demande"><span className="adm-cell-sub">{formatDateTime(alert.createdAt)}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {alert.notifiedAt ? (
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy === alert.id} onClick={() => setNotified(alert, false)}><RotateCcw aria-hidden /> Réarmer</button>
                      ) : (
                        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" disabled={busy === alert.id} onClick={() => setNotified(alert, true)}><Check aria-hidden /> Marquer prévenue</button>
                      )}
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={busy === alert.id} onClick={() => remove(alert)} aria-label={`Supprimer l'alerte de ${alert.email}`}><Trash2 aria-hidden /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
