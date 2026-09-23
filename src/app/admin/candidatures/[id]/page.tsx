import { notFound } from "next/navigation";
import { ApplicationDetailActions } from "@/components/admin/applications";
import { requireAdminStaff } from "@/components/admin/staff";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { formatLongDateTime, instagramHandle, instagramUrl } from "@/components/admin/format";
import { APPLICATION_STATUS } from "@/components/admin/labels";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Candidature" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [, application] = await Promise.all([requireAdminStaff(), prisma.ambassadorApplication.findUnique({ where: { id } })]);
  if (!application) notFound();
  const status = APPLICATION_STATUS[application.status];
  const instagram = instagramUrl(application.instagram);
  const item = {
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: application.phone,
    instagram: application.instagram,
    city: application.city,
    message: application.message,
    status: application.status,
    createdAt: application.createdAt.toISOString(),
  };

  return (
    <>
      <PageHeader
        back={{ href: "/admin/candidatures", label: "Candidatures" }}
        title={`${application.firstName} ${application.lastName}`}
        meta={<><Badge tone={status.tone}>{status.label}</Badge><span className="adm-muted" style={{ fontSize: 13 }}>Reçue le {formatLongDateTime(application.createdAt)}</span></>}
      />
      <div className="adm-form-layout">
        <div className="adm-form-main">
          <Card title="Message">
            <p className="adm-message">{application.message}</p>
          </Card>
        </div>
        <aside className="adm-form-aside" aria-label="Coordonnées et actions">
          <Card title="Suivi">
            <ApplicationDetailActions item={item} />
          </Card>
          <Card title="Coordonnées">
            <dl className="adm-dl">
              <div><dt>E-mail</dt><dd><a href={`mailto:${application.email}`}>{application.email}</a></dd></div>
              {application.phone && <div><dt>Téléphone</dt><dd><a href={`tel:${application.phone.replace(/\s+/g, "")}`}>{application.phone}</a></dd></div>}
              {application.instagram && (
                <div><dt>Instagram</dt><dd>{instagram ? <a href={instagram} target="_blank" rel="noopener noreferrer">{instagramHandle(application.instagram)}</a> : application.instagram}</dd></div>
              )}
              {application.city && <div><dt>Ville</dt><dd>{application.city}</dd></div>}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
