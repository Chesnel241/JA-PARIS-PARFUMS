import { ApiError, handleApi, json, noContent, parseId, requireApiStaff } from "@/lib/api";
import { describeMediaUsages, findMediaUsages, mediaUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { revalidateMedia } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND = "Média introuvable.";

// Métadonnées + usages d'un média.
export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/media:get", async () => {
    await requireApiStaff();
    const id = await parseId(params, NOT_FOUND);
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
    });
    if (!asset) throw new ApiError(404, NOT_FOUND);
    return json({ asset: { ...asset, url: mediaUrl(asset.id) }, usages: await findMediaUsages(id) });
  });
}

// Suppression. Refusée (409) si le média est encore utilisé, sauf ?force=1.
export async function DELETE(request: Request, { params }: RouteContext) {
  return handleApi("admin/media:delete", async () => {
    await requireApiStaff();
    const id = await parseId(params, NOT_FOUND);
    const force = ["1", "true"].includes(new URL(request.url).searchParams.get("force") ?? "");

    const exists = await prisma.mediaAsset.count({ where: { id } });
    if (!exists) throw new ApiError(404, NOT_FOUND);

    const usages = await findMediaUsages(id);
    if (usages.length > 0 && !force) {
      throw new ApiError(409, describeMediaUsages(usages), { code: "MEDIA_IN_USE", usages });
    }

    const deleted = await prisma.mediaAsset.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new ApiError(404, NOT_FOUND);
    revalidateMedia({ deletedInUse: usages.length > 0 });
    return noContent();
  }, { notFound: NOT_FOUND });
}
