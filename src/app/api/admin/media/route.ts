import { ApiError, handleApi, json, requireApiStaff } from "@/lib/api";
import { MAX_MEDIA_SIZE, detectImageType, mediaUrl, sanitizeFilename } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { revalidateMedia } from "@/lib/revalidate";

const TOO_LARGE = "L'image dépasse 4 Mo. Réduisez-la (JPEG ou WebP conseillés) puis réessayez.";
const UNSUPPORTED = "Format non pris en charge. Utilisez JPEG, PNG, WebP, GIF ou AVIF (SVG et HTML refusés).";

const assetSelect = { id: true, filename: true, mimeType: true, size: true, createdAt: true } as const;

export async function GET() {
  return handleApi("admin/media:list", async () => {
    await requireApiStaff();
    const assets = await prisma.mediaAsset.findMany({ select: assetSelect, orderBy: { createdAt: "desc" } });
    return json({ assets: assets.map((asset) => ({ ...asset, url: mediaUrl(asset.id) })) });
  });
}

export async function POST(request: Request) {
  return handleApi("admin/media:upload", async () => {
    await requireApiStaff();

    // Rejet anticipé si le corps annoncé dépasse la limite (+ marge multipart).
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_MEDIA_SIZE + 64 * 1024) throw new ApiError(413, TOO_LARGE);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "Aucun fichier reçu (champ « file » attendu).");
    if (file.size === 0) throw new ApiError(422, "Le fichier est vide.");
    if (file.size > MAX_MEDIA_SIZE) throw new ApiError(413, TOO_LARGE);

    const data = Buffer.from(await file.arrayBuffer());
    if (data.byteLength > MAX_MEDIA_SIZE) throw new ApiError(413, TOO_LARGE);

    // Le type réel est déterminé par la signature binaire, pas par le navigateur.
    const mimeType = detectImageType(data);
    if (!mimeType) throw new ApiError(415, UNSUPPORTED);

    const asset = await prisma.mediaAsset.create({
      data: { filename: sanitizeFilename(file.name, mimeType), mimeType, size: data.byteLength, data },
      select: assetSelect,
    });
    revalidateMedia();

    return json({ asset: { ...asset, url: mediaUrl(asset.id) } }, { status: 201 });
  });
}
