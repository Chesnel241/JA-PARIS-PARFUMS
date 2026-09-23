import { z } from "zod";
import { handleApi, json, parseJson, requireApiStaff } from "@/lib/api";
import { imageReferenceSchema } from "@/lib/product-validation";
import { revalidateSiteSettings } from "@/lib/revalidate";
import { IMAGE_SLOTS, IMAGE_SLOT_KEYS, deleteSiteSetting, getSiteImages, setSiteSetting } from "@/lib/site-settings";

const settingSchema = z.object({
  key: z.enum(IMAGE_SLOT_KEYS as [string, ...string[]], { error: "Emplacement d'image inconnu." }),
  // Valeur vide = retour à l'image par défaut.
  value: z.union([imageReferenceSchema, z.literal("")]),
});

export async function GET() {
  return handleApi("admin/settings:get", async () => {
    await requireApiStaff();
    return json({ images: await getSiteImages(), slots: IMAGE_SLOTS });
  });
}

export async function PUT(request: Request) {
  return handleApi("admin/settings:update", async () => {
    await requireApiStaff();
    const { key, value } = await parseJson(request, settingSchema, { message: "Réglage invalide." });
    if (value === "") await deleteSiteSetting(key);
    else await setSiteSetting(key, value);
    revalidateSiteSettings();
    return json({ images: await getSiteImages() });
  });
}
