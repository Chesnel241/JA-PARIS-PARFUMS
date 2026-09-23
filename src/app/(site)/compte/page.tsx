import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/current-staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compte", robots: { index: false, follow: false } };

// Pas de comptes clients : l'ancienne page « Mon compte » redirige l'équipe
// connectée vers l'administration, et tout autre visiteur vers l'accueil.
export default async function AccountPage() {
  let isStaff = false;
  try {
    isStaff = Boolean(await getCurrentStaff());
  } catch {
    isStaff = false;
  }
  redirect(isStaff ? "/admin" : "/");
}
