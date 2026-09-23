import { notFound } from "next/navigation";
import { requireAdminStaff } from "@/components/admin/staff";

// Toute adresse /admin/… inconnue affiche la page « introuvable » de l'admin
// (dans le shell) plutôt que la 404 de la boutique.
export default async function AdminUnknownPage() {
  await requireAdminStaff();
  notFound();
}
