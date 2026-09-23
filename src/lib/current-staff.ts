import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const STAFF_ROLES: readonly Role[] = [Role.ADMIN, Role.EDITOR];

export function isStaffRole(role: unknown): role is Role {
  return STAFF_ROLES.includes(role as Role);
}

// Session Auth.js de la requête courante. Mémorisée par requête (React.cache)
// et ne lève jamais : une session illisible (secret absent ou changé, cookie
// corrompu) équivaut à « non connecté ».
export const getSession = cache(async () => {
  try {
    return await auth();
  } catch (error) {
    // Laisse passer les signaux internes de Next.js (rendu dynamique, redirect,
    // notFound) : les avaler figerait les pages admin au build en « déconnecté ».
    unstable_rethrow(error);
    console.error("[auth] lecture de la session impossible :", error);
    return null;
  }
});

// Membre de l'équipe (ADMIN ou EDITOR) connecté et actif, relu en base à
// chaque requête (un compte désactivé perd l'accès immédiatement).
// Mémorisé par requête : le layout admin et la page peuvent l'appeler tous
// les deux sans double requête.
export const getCurrentStaff = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user?.isActive || !isStaffRole(user.role)) return null;
  return user;
});
