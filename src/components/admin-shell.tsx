import { OrderStatus, PaymentStatus } from "@prisma/client";
import { AdminFrame } from "@/components/admin/admin-frame";
import { countNewApplications } from "@/lib/community-service";
import { prisma } from "@/lib/prisma";

// Commandes « à traiter » : paiement à confirmer, ou payées et à préparer/expédier.
export const ORDERS_TO_PROCESS_WHERE = {
  status: { not: OrderStatus.CANCELLED },
  OR: [
    { paymentStatus: PaymentStatus.UNPAID },
    { paymentStatus: PaymentStatus.PAID, status: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING] } },
  ],
};

async function loadBadges() {
  // Les compteurs ne doivent jamais empêcher l'admin de s'afficher.
  const [orders, applications] = await Promise.all([
    prisma.order.count({ where: ORDERS_TO_PROCESS_WHERE }).catch(() => 0),
    countNewApplications().catch(() => 0),
  ]);
  return { orders, applications };
}

export async function AdminShell({ user, children }: { user: { name: string | null; email: string; role: string }; children: React.ReactNode }) {
  const badges = await loadBadges();
  return <AdminFrame user={{ name: user.name, email: user.email, role: user.role }} badges={badges}>{children}</AdminFrame>;
}
