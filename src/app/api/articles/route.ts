import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { id: 1, title: "Nos secrets de fabrication", slug: "secrets-fabrication" },
    { id: 2, title: "L'art de choisir sa signature", slug: "choisir-signature" },
    { id: 3, title: "Dans les coulisses d'Illusion", slug: "coulisses-illusion" },
  ]);
}
