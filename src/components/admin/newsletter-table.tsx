"use client";

import { useMemo, useState } from "react";
import { Download, Mail, SearchX } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { csvFilename, downloadCsv } from "@/components/admin/csv";
import { formatCsvDate, formatDateTime } from "@/components/admin/format";
import { LocalSearchField, normalizeSearch } from "@/components/admin/search-field";
import { useToast } from "@/components/admin/toast";
import { EmptyState } from "@/components/admin/ui";

export type Subscriber = { id: string; email: string; createdAt: string };

const PAGE = 100;

export function NewsletterTable({ subscribers }: { subscribers: Subscriber[] }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const visible = useMemo(() => {
    const q = normalizeSearch(query);
    return q ? subscribers.filter((subscriber) => subscriber.email.toLowerCase().includes(q)) : subscribers;
  }, [subscribers, query]);

  if (subscribers.length === 0) {
    return <div className="adm-card"><EmptyState icon={Mail} title="Aucun abonné pour le moment" description="Les inscriptions au « Cercle JAE » depuis la page d'accueil apparaîtront ici." /></div>;
  }

  return (
    <div className="adm-card adm-card--flush">
      <div className="adm-toolbar">
        <LocalSearchField id="newsletter-search" label="Rechercher une adresse" placeholder="Rechercher une adresse e-mail…" value={query} onChange={(value) => { setQuery(value); setLimit(PAGE); }} />
        <CopyButton className="adm-btn adm-btn--secondary" text={visible.map((subscriber) => subscriber.email).join(", ")} label="Copier les adresses" successMessage={`${visible.length} adresse${visible.length > 1 ? "s" : ""} copiée${visible.length > 1 ? "s" : ""} (à coller en Cci)`} />
        <button type="button" className="adm-btn adm-btn--primary" disabled={!visible.length} onClick={() => {
          downloadCsv(csvFilename("newsletter-jae"), ["E-mail", "Date d'inscription"], visible.map((subscriber) => [subscriber.email, formatCsvDate(subscriber.createdAt)]));
          toast.success(`${visible.length} abonné${visible.length > 1 ? "s" : ""} exporté${visible.length > 1 ? "s" : ""}`, "Fichier CSV compatible Excel.");
        }}>
          <Download aria-hidden /> Exporter en CSV
        </button>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucune adresse trouvée" description={`Aucun abonné ne correspond à « ${query} ».`} />
      ) : (
        <>
          <table className="adm-table">
            <caption className="adm-sr-only">Abonnés à la newsletter</caption>
            <thead><tr><th scope="col">Adresse e-mail</th><th scope="col">Inscription</th></tr></thead>
            <tbody>
              {visible.slice(0, limit).map((subscriber) => (
                <tr key={subscriber.id}>
                  <td className="adm-td-primary"><a className="adm-cell-title adm-break" href={`mailto:${subscriber.email}`} style={{ whiteSpace: "normal" }}>{subscriber.email}</a></td>
                  <td data-label="Inscription"><span className="adm-cell-sub">{formatDateTime(subscriber.createdAt)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length > limit && (
            <div className="adm-pagination">
              <span>{limit} affichés sur {visible.length.toLocaleString("fr-FR")}</span>
              <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => setLimit((value) => value + PAGE)}>Afficher plus</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
