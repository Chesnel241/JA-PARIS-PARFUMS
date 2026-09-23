import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentStaff, getSession } from "@/lib/current-staff";

// En-tête posé par le middleware sur les requêtes /admin : chemin + requête
// courants, pour revenir au bon écran après connexion.
export const ADMIN_PATH_HEADER = "x-jae-pathname";

export const ADMIN_LOGIN_PATH = "/connexion-admin";

// N'accepte qu'un chemin interne à l'admin (aucune redirection ouverte).
export function safeAdminCallbackUrl(value: string | null | undefined) {
  if (!value || value.length > 512) return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value !== "/admin" && !/^\/admin[/?#]/.test(value)) return "/admin";
  return value;
}

export function adminLoginUrl(callbackUrl: string, accessDenied = false) {
  const params = new URLSearchParams({ callbackUrl: safeAdminCallbackUrl(callbackUrl) });
  if (accessDenied) params.set("error", "AccessDenied");
  return `${ADMIN_LOGIN_PATH}?${params.toString()}`;
}

// Garde des pages admin (Server Components). Redirige vers la connexion en
// conservant l'écran demandé. `error=AccessDenied` n'est ajouté que si une
// session existe sans donner les droits (sinon simple invitation à se connecter).
export async function requireStaff() {
  const user = await getCurrentStaff();
  if (user) return user;

  const [session, headerList] = await Promise.all([getSession(), headers()]);
  redirect(adminLoginUrl(headerList.get(ADMIN_PATH_HEADER) ?? "/admin", Boolean(session?.user?.id)));
}
