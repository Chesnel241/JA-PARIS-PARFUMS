import { LogOut } from "lucide-react";
import { signOut } from "@/auth";

export function AdminSignOut() {
  return (
    <form action={async () => {
      "use server";
      await signOut({ redirectTo: "/connexion-admin" });
    }}>
      <button className="admin-sign-out" type="submit"><LogOut /> Se déconnecter</button>
    </form>
  );
}
