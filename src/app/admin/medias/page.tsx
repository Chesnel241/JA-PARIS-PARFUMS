import { AdminShell } from "@/components/admin-shell";
import { MediaLibrary } from "@/components/media-library";
import { requireStaff } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Médias · Maison" };

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const [user, assets] = await Promise.all([
    requireStaff(),
    prisma.mediaAsset.findMany({
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AdminShell user={user}>
      <header className="admin-content-header"><div><p>Bibliothèque</p><h1>Les médias.</h1></div></header>
      <MediaLibrary assets={assets.map((asset) => ({ ...asset, createdAt: asset.createdAt.toISOString() }))} />
    </AdminShell>
  );
}
