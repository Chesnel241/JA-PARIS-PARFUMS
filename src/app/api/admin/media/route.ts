import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { prisma } from "@/lib/prisma";

// 4 Mo : sous la limite de corps de requête des fonctions Vercel (4,5 Mo).
const MAX_SIZE = 4 * 1024 * 1024;
// Pas de SVG (risque XSS) : uniquement des formats bitmap sûrs.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function GET() {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const assets = await prisma.mediaAsset.findMany({
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 422 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Format non pris en charge. Utilisez JPEG, PNG, WebP, GIF ou AVIF." }, { status: 422 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: "L'image doit faire entre 1 octet et 4 Mo." }, { status: 422 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const asset = await prisma.mediaAsset.create({
    data: {
      filename: file.name.slice(0, 200) || "image",
      mimeType: file.type,
      size: data.byteLength,
      data,
    },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
  });

  return NextResponse.json({ asset: { ...asset, url: `/api/media/${asset.id}` } }, { status: 201 });
}
