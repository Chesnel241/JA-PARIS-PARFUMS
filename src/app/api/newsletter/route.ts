import { NextResponse } from "next/server";
import { newsletterInputSchema, subscribeToNewsletter } from "@/lib/newsletter-service";

export async function POST(request: Request) {
  const parsed = newsletterInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 422 });
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 201 });

  try {
    await subscribeToNewsletter(parsed.data.email);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[newsletter] inscription impossible :", error);
    return NextResponse.json({ error: "Inscription impossible pour le moment. Réessayez dans un instant." }, { status: 500 });
  }
}
