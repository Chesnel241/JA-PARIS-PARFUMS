import { NextResponse } from "next/server";
import { createApplication } from "@/lib/community-service";
import { applicationInputSchema } from "@/lib/community-validation";

// Candidature publique « Devenir ambassadrice ».
export async function POST(request: Request) {
  const parsed = applicationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Merci de vérifier les champs du formulaire.", fields: parsed.error.flatten() }, { status: 422 });
  }

  // Pot de miel rempli : on répond comme si tout allait bien, sans rien enregistrer.
  const { website, ...input } = parsed.data;
  if (website) return NextResponse.json({ ok: true }, { status: 201 });

  try {
    await createApplication(input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[applications] création impossible :", error);
    return NextResponse.json({ error: "Votre candidature n'a pas pu être envoyée. Réessayez dans un instant." }, { status: 500 });
  }
}
