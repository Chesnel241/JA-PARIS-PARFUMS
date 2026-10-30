import { z } from "zod";
import { ApiError, handleApi, json, parseJson } from "@/lib/api";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { isCrossSiteRequest } from "@/lib/same-origin";
import { CHECKOUT_SESSION_ID_PATTERN } from "@/lib/stripe";
import { cancelCardCheckout } from "@/lib/stripe-checkout";

// Le client revient de Stripe sans payer (« Retour ») ou abandonne : la page
// de paiement est fermée et le stock réservé immédiatement restitué.
const bodySchema = z.object({
  sessionId: z.string().regex(CHECKOUT_SESSION_ID_PATTERN, "Paiement introuvable."),
});

export async function POST(request: Request) {
  return handleApi("checkout:cancel", async () => {
    if (isCrossSiteRequest(request)) throw new ApiError(403, "Requête refusée.");
    const { sessionId } = await parseJson(request, bodySchema, { useFirstIssue: true });
    await enforceRateLimit(request, RATE_LIMITS.checkout, "Trop de tentatives depuis cette connexion.");
    return json({ state: await cancelCardCheckout(sessionId) });
  });
}
