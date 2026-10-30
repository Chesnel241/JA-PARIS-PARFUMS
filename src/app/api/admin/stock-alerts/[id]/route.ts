import { z } from "zod";
import { handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { revalidateStockAlerts } from "@/lib/revalidate";
import { deleteStockAlert, setStockAlertNotified } from "@/lib/stock-alert-service";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Alerte introuvable." };
const patchSchema = z.object({ notified: z.boolean() });

// Marque une alerte comme prévenue (ou la réarme).
export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/stock-alerts:update", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { notified } = await parseJson(request, patchSchema);
    const alert = await setStockAlertNotified(id, notified);
    revalidateStockAlerts();
    return json({ alert });
  }, messages);
}

// Suppression (demande RGPD, doublon…).
export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/stock-alerts:delete", async () => {
    await requireApiStaff();
    await deleteStockAlert(await parseId(params, messages.notFound));
    revalidateStockAlerts();
    return noContent();
  }, messages);
}
