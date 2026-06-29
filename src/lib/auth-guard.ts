import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/current-staff";

export async function requireStaff() {
  const user = await getCurrentStaff();
  if (!user) redirect("/connexion-admin?callbackUrl=/admin&error=AccessDenied");
  return user;
}
