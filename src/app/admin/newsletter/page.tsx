import { NewsletterTable } from "@/components/admin/newsletter-table";
import { requireAdminStaff } from "@/components/admin/staff";
import { PageHeader } from "@/components/admin/ui";
import { plural } from "@/components/admin/format";
import { listNewsletterSubscribers } from "@/lib/newsletter-service";

export const metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const [, subscribers] = await Promise.all([requireAdminStaff(), listNewsletterSubscribers()]);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = subscribers.filter((subscriber) => subscriber.createdAt.getTime() >= since).length;
  return (
    <>
      <PageHeader
        eyebrow="Communauté"
        title="Newsletter"
        description={`${plural(subscribers.length, "abonné")} au Cercle JAE${recent ? `, dont ${recent} ces 30 derniers jours` : ""}. Exportez la liste pour votre outil d'e-mailing.`}
      />
      <NewsletterTable subscribers={subscribers.map((subscriber) => ({ id: subscriber.id, email: subscriber.email, createdAt: subscriber.createdAt.toISOString() }))} />
    </>
  );
}
