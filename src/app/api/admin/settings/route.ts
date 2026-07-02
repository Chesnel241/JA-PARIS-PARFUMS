import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/current-staff";
import { imageReferenceSchema } from "@/lib/product-validation";
import { IMAGE_SLOT_KEYS, deleteSiteSetting, getSiteImages, setSiteSetting } from "@/lib/site-settings";

const settingSchema = z.object({
  key: z.enum(IMAGE_SLOT_KEYS as [string, ...string[]]),
  // Valeur vide = retour à l'image par défaut.
  value: z.union([imageReferenceSchema, z.literal("")]),
});

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json({ images: await getSiteImages() });
}

export async function PUT(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const parsed = settingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Réglage invalide." }, { status: 422 });

  try {
    if (parsed.data.value === "") {
      await deleteSiteSetting(parsed.data.key);
    } else {
      await setSiteSetting(parsed.data.key, parsed.data.value);
    }
    return NextResponse.json({ images: await getSiteImages() });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
