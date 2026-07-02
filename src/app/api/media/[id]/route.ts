import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// Sert une image téléversée depuis l'admin. Public (les visuels du site sont
// publics) et immuable : l'id change à chaque téléversement, on peut donc
// mettre en cache indéfiniment.
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } }).catch(() => null);
  if (!asset) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });

  return new NextResponse(Buffer.from(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
