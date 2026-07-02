import { AdminShell } from "@/components/admin-shell";
import { AppearanceForm } from "@/components/appearance-form";
import { requireStaff } from "@/lib/auth-guard";
import { IMAGE_SLOTS, getSiteImages } from "@/lib/site-settings";

export const metadata = { title: "Apparence · Maison" };

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const [user, images] = await Promise.all([requireStaff(), getSiteImages()]);
  const slots = IMAGE_SLOTS.map((slot) => ({ ...slot, current: images[slot.key] }));

  return (
    <AdminShell user={user}>
      <header className="admin-content-header">
        <div>
          <p>Personnalisation</p>
          <h1>L&apos;apparence du site.</h1>
        </div>
      </header>
      <p className="appearance-intro">Remplacez les images de la page d&apos;accueil sans toucher au code : téléversez une image ou collez une URL, puis enregistrez. « Image d&apos;origine » restaure le visuel initial.</p>
      <AppearanceForm slots={slots} />
    </AdminShell>
  );
}
