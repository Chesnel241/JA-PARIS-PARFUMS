import { ApiError, handleApi, json, parseJson } from "@/lib/api";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { isCrossSiteRequest } from "@/lib/same-origin";
import { revalidateStockAlerts } from "@/lib/revalidate";
import { createStockAlert } from "@/lib/stock-alert-service";
import { stockAlertInputSchema } from "@/lib/stock-alert-validation";

// « M'avertir du retour » : alerte publique sur une contenance épuisée.
export async function POST(request: Request) {
  return handleApi("stock-alerts:create", async () => {
    if (isCrossSiteRequest(request)) throw new ApiError(403, "Requête refusée (origine non autorisée).");
    const { website, ...input } = await parseJson(request, stockAlertInputSchema, { message: "Adresse e-mail invalide." });
    // Pot de miel rempli : réponse identique, rien n'est enregistré.
    if (website) return json({ ok: true }, { status: 201 });

    await enforceRateLimit(request, RATE_LIMITS.stockAlerts, "Trop de demandes depuis cette connexion.");
    await createStockAlert(input);
    revalidateStockAlerts();
    return json({ ok: true }, { status: 201 });
  });
}
