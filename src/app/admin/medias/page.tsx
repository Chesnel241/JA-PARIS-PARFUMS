import { MediaLibrary } from "@/components/media-library";
import { requireAdminStaff } from "@/components/admin/staff";
import { PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Médiathèque" };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const [, assets] = await Promise.all([
    requireAdminStaff(),
    prisma.mediaAsset.findMany({
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Contenu" title="Médiathèque" description="Toutes vos images téléversées, réutilisables dans les produits, articles, ambassadrices, boutiques et l'apparence du site." />
      <MediaLibrary assets={assets.map((asset) => ({ ...asset, createdAt: asset.createdAt.toISOString() }))} />
    </>
  );
}
