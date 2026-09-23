import { handleApi, isValidId, jsonError } from "@/lib/api";
import { ALLOWED_MEDIA_TYPES } from "@/lib/media";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_FOUND = "Média introuvable.";
const ALLOWED = new Set<string>(ALLOWED_MEDIA_TYPES);

// Sert une image téléversée depuis l'admin. Public (les visuels du site sont
// publics) et immuable : l'id change à chaque téléversement, on peut donc
// mettre en cache indéfiniment (navigateur + CDN).
export async function GET(request: Request, { params }: RouteContext) {
  return handleApi("media:get", async () => {
    const { id } = await params;
    if (!isValidId(id)) return jsonError(404, NOT_FOUND);

    const etag = `"${id}"`;
    const cacheHeaders = {
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    };

    // Le contenu d'un id ne change jamais : un ETag identique suffit (304),
    // sans même relire l'image en base.
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch.split(",").some((value) => value.trim().replace(/^W\//, "") === etag)) {
      const exists = await prisma.mediaAsset.count({ where: { id } });
      if (exists) return new Response(null, { status: 304, headers: cacheHeaders });
    }

    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { data: true, mimeType: true, filename: true } });
    if (!asset) return jsonError(404, NOT_FOUND);

    // Ne sert jamais un type non image (défense en profondeur).
    const contentType = ALLOWED.has(asset.mimeType) ? asset.mimeType : "application/octet-stream";
    const body = Buffer.from(asset.data);
    const filename = encodeURIComponent(asset.filename || "image");

    return new Response(body, {
      status: 200,
      headers: {
        ...cacheHeaders,
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  });
}
