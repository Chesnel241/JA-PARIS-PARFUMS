import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/data";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion-admin?callbackUrl=/compte");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { orders: { orderBy: { createdAt: "desc" }, include: { items: true } } },
  });

  if (!user) redirect("/connexion-admin");

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Espace client</p>
        <h1>Bonjour,<br /><em>{user.name ?? "Maison JAE"}.</em></h1>
      </header>
      <div style={{ display: "grid", gap: 24 }}>
        <section style={{ background: "white", padding: 30 }}>
          <h2 style={{ margin: "0 0 18px", font: "500 24px var(--font-display), serif" }}>Informations</h2>
          <p style={{ color: "#6e665e", fontSize: 13 }}>{user.email}</p>
        </section>
        <section style={{ background: "white", padding: 30 }}>
          <h2 style={{ margin: "0 0 18px", font: "500 24px var(--font-display), serif" }}>Commandes</h2>
          {user.orders.length === 0 ? (
            <p style={{ color: "#817970" }}>Aucune commande pour le moment.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {user.orders.map((order) => (
                <div key={order.id} style={{ borderTop: "1px solid #e6e2dd", padding: "16px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>#{order.id.slice(-8).toUpperCase()}</span>
                    <span>{new Date(order.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "#6e665e" }}>
                      {order.items.map((i) => `${i.name} · ${i.volume}`).join(", ")}
                    </span>
                    <strong style={{ fontSize: 13 }}>{formatPrice(order.totalAmount)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
