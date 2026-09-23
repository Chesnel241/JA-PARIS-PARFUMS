import { handleApi, json, parseJson } from "@/lib/api";
import { subscribeToNewsletter } from "@/lib/newsletter-service";
import { newsletterInputSchema } from "@/lib/newsletter-validation";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { revalidateNewsletter } from "@/lib/revalidate";

// Inscription publique au « Cercle JAE ». Idempotente.
export async function POST(request: Request) {
  return handleApi("newsletter:subscribe", async () => {
    const input = await parseJson(request, newsletterInputSchema, { message: "Adresse e-mail invalide." });
    if (input.website) return json({ ok: true }, { status: 201 });

    await enforceRateLimit(request, RATE_LIMITS.newsletter, "Trop d'inscriptions depuis cette connexion.");
    await subscribeToNewsletter(input.email);
    revalidateNewsletter();
    return json({ ok: true }, { status: 201 });
  });
}
