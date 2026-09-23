import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/current-staff";

export const dynamic = "force-dynamic";

// Pas de comptes clients : l'ancienne page « Mon compte » redirige (307) l'équipe
// connectée vers l'administration, et tout autre visiteur vers l'accueil.
export async function GET(request: Request) {
  let isStaff = false;
  try {
    isStaff = Boolean(await getCurrentStaff());
  } catch {
    isStaff = false;
  }
  const response = NextResponse.redirect(new URL(isStaff ? "/admin" : "/", request.url), 307);
  response.headers.set("X-Robots-Tag", "noindex");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
