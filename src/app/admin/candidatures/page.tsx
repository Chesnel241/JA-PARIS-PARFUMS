import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import { ApplicationsTable } from "@/components/admin/applications";
import { requireAdminStaff } from "@/components/admin/staff";
import { PageHeader } from "@/components/admin/ui";
import { APPLICATION_STATUS, APPLICATION_STATUS_ORDER } from "@/components/admin/labels";
import { listApplications } from "@/lib/community-service";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Candidatures" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const [, { statut }] = await Promise.all([requireAdminStaff(), searchParams]);
  const status = APPLICATION_STATUS_ORDER.find((value) => value === statut) as ApplicationStatus | undefined;
  const [applications, grouped] = await Promise.all([
    listApplications(status),
    prisma.ambassadorApplication.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((row) => [row.status, row._count._all])) as Record<string, number>;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const tabs = [{ key: "", label: "Toutes", count: total }, ...APPLICATION_STATUS_ORDER.map((key) => ({ key, label: APPLICATION_STATUS[key].plural, count: counts[key] ?? 0 }))];

  return (
    <>
      <PageHeader eyebrow="Communauté" title="Candidatures" description="Les demandes « Devenir ambassadrice » envoyées depuis le site. Suivez chaque candidature jusqu'à votre réponse." />
      <nav className="adm-tabs" aria-label="Filtrer par statut">
        {tabs.map((tab) => (
          <Link key={tab.key || "all"} className="adm-tab" href={tab.key ? `/admin/candidatures?statut=${tab.key}` : "/admin/candidatures"} aria-current={(status ?? "") === tab.key ? "page" : undefined} scroll={false}>
            {tab.label}<span className="adm-tab-count">{tab.count}</span>
          </Link>
        ))}
      </nav>
      <ApplicationsTable
        statusLabel={status ? APPLICATION_STATUS[status].label.toLowerCase() : "pour le moment"}
        items={applications.map((item) => ({
          id: item.id,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
          instagram: item.instagram,
          city: item.city,
          message: item.message,
          status: item.status,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
