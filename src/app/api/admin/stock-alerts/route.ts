import { z } from "zod";
import { handleApi, json, parseQuery, requireApiStaff } from "@/lib/api";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";
import { listStockAlerts } from "@/lib/stock-alert-service";

const querySchema = z.object({ format: z.enum(["json", "csv"]).optional() });

// Alertes « M'avertir du retour » (JSON) ou export CSV (?format=csv).
export async function GET(request: Request) {
  return handleApi("admin/stock-alerts:list", async () => {
    await requireApiStaff();
    const { format } = parseQuery(request, querySchema);
    const alerts = await listStockAlerts();

    if (format === "csv") {
      return csvResponse(
        "alertes-retour-jae",
        toCsv(
          ["E-mail", "Produit", "Contenance", "Stock actuel", "Demande", "Prévenue le"],
          alerts.map((alert) => [alert.email, alert.product.name, alert.volume, alert.stock, csvDate(alert.createdAt), csvDate(alert.notifiedAt)]),
        ),
      );
    }

    return json({ alerts });
  });
}
