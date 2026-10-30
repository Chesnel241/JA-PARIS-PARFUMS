import { z } from "zod";
import { handleApi, json, parseQuery } from "@/lib/api";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { CHECKOUT_SESSION_ID_PATTERN } from "@/lib/stripe";
import { getCheckoutStatus } from "@/lib/stripe-checkout";

// État d'un paiement par carte au retour de la page Stripe
// (/panier?etape=confirmation&session_id=…). L'identifiant de session, secret
// et propre à l'acheteur, sert de clé d'accès au récapitulatif.
const querySchema = z.object({
  session_id: z.string().regex(CHECKOUT_SESSION_ID_PATTERN, "Paiement introuvable."),
});

export async function GET(request: Request) {
  return handleApi("checkout:status", async () => {
    const { session_id: sessionId } = parseQuery(request, querySchema, { useFirstIssue: true });
    await enforceRateLimit(request, RATE_LIMITS.checkout, "Trop de vérifications de paiement depuis cette connexion.");
    return json(await getCheckoutStatus(sessionId));
  });
}
