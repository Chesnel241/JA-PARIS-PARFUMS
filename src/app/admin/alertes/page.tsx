import { StockAlertsTable } from "@/components/admin/stock-alerts-table";
import { requireAdminStaff } from "@/components/admin/staff";
import { PageHeader } from "@/components/admin/ui";
import { plural } from "@/components/admin/format";
import { listStockAlerts } from "@/lib/stock-alert-service";

export const metadata = { title: "Alertes retour" };
export const dynamic = "force-dynamic";

export default async function AdminStockAlertsPage() {
  const [, alerts] = await Promise.all([requireAdminStaff(), listStockAlerts()]);
  const toNotify = alerts.filter((alert) => !alert.notifiedAt && alert.stock > 0).length;
  return (
    <>
      <PageHeader
        eyebrow="Ventes"
        title="Alertes retour"
        description={`${plural(alerts.length, "demande")} « M'avertir du retour »${toNotify ? `, dont ${toNotify} à prévenir : la contenance est de nouveau en stock` : ""}. Prévenez les clientes par e-mail, puis marquez l'alerte comme traitée.`}
      />
      <StockAlertsTable
        alerts={alerts.map((alert) => ({
          id: alert.id,
          email: alert.email,
          volume: alert.volume,
          stock: alert.stock,
          createdAt: alert.createdAt.toISOString(),
          notifiedAt: alert.notifiedAt?.toISOString() ?? null,
          product: alert.product,
        }))}
      />
    </>
  );
}
