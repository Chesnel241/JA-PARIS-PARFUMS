import { handleApi, json, parseJson } from "@/lib/api";
import { createApplication } from "@/lib/community-service";
import { applicationInputSchema } from "@/lib/community-validation";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { revalidateApplications } from "@/lib/revalidate";

// Candidature publique « Devenir ambassadrice ».
export async function POST(request: Request) {
  return handleApi("ambassador-applications:create", async () => {
    const parsed = await parseJson(request, applicationInputSchema, { message: "Merci de vérifier les champs du formulaire." });

    // Pot de miel rempli : on répond comme si tout allait bien, sans rien enregistrer.
    const { website, ...input } = parsed;
    if (website) return json({ ok: true }, { status: 201 });

    await enforceRateLimit(request, RATE_LIMITS.applications, "Vous avez déjà envoyé plusieurs candidatures.");
    await createApplication(input);
    revalidateApplications();
    return json({ ok: true }, { status: 201 });
  });
}
