import { ExternalLink } from "lucide-react";
import { AppearanceForm } from "@/components/appearance-form";
import { requireAdminStaff } from "@/components/admin/staff";
import { PageHeader } from "@/components/admin/ui";
import { IMAGE_SLOTS, getSiteImages } from "@/lib/site-settings";

export const metadata = { title: "Apparence" };
export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [, images] = await Promise.all([requireAdminStaff(), getSiteImages()]);
  const slots = IMAGE_SLOTS.map((slot) => ({ key: slot.key, label: slot.label, description: slot.description, defaultValue: slot.defaultValue, current: images[slot.key] }));

  return (
    <>
      <PageHeader
        eyebrow="Contenu"
        title="Apparence du site"
        description="Remplacez les images de la page d'accueil sans toucher au code. Chaque aperçu reproduit le cadrage réel de l'emplacement."
        actions={<a className="adm-btn adm-btn--secondary" href="/" target="_blank" rel="noopener"><ExternalLink aria-hidden /> Voir l&apos;accueil</a>}
      />
      <AppearanceForm slots={slots} />
    </>
  );
}
