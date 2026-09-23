import { cache } from "react";
import { requireStaff } from "@/lib/auth-guard";

// requireStaff() mémorisé pour la durée d'une requête : le layout et la page
// vérifient tous deux l'accès (défense en profondeur) sans double requête.
export const requireAdminStaff = cache(requireStaff);
