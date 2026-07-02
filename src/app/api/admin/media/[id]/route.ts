import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await getCurrentStaff())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.mediaAsset.deleteMany({ where: { id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
