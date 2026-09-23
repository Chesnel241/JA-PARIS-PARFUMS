import { Prisma, type ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AmbassadorInput, ApplicationInput, StoreInput } from "@/lib/community-validation";

const displayOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

// Ambassadrices — administration
export function listAdminAmbassadors() {
  return prisma.ambassador.findMany({ orderBy: displayOrder });
}

export function getAdminAmbassador(id: string) {
  return prisma.ambassador.findUnique({ where: { id } });
}

export function createAdminAmbassador(input: AmbassadorInput) {
  return prisma.ambassador.create({ data: input });
}

export function updateAdminAmbassador(id: string, input: AmbassadorInput) {
  return prisma.ambassador.update({ where: { id }, data: input });
}

export function setAdminAmbassadorStatus(id: string, isActive: boolean) {
  return prisma.ambassador.update({ where: { id }, data: { isActive } });
}

export function deleteAdminAmbassador(id: string) {
  return prisma.ambassador.delete({ where: { id } });
}

// Boutiques — administration
export function listAdminStores() {
  return prisma.store.findMany({ orderBy: displayOrder });
}

export function getAdminStore(id: string) {
  return prisma.store.findUnique({ where: { id } });
}

export function createAdminStore(input: StoreInput) {
  return prisma.store.create({ data: input });
}

export function updateAdminStore(id: string, input: StoreInput) {
  return prisma.store.update({ where: { id }, data: input });
}

export function setAdminStoreStatus(id: string, isActive: boolean) {
  return prisma.store.update({ where: { id }, data: { isActive } });
}

export function deleteAdminStore(id: string) {
  return prisma.store.delete({ where: { id } });
}

// Candidatures — administration
export function listApplications(status?: ApplicationStatus) {
  return prisma.ambassadorApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export function countNewApplications() {
  return prisma.ambassadorApplication.count({ where: { status: "NEW" } });
}

export function setApplicationStatus(id: string, status: ApplicationStatus) {
  return prisma.ambassadorApplication.update({ where: { id }, data: { status } });
}

export function deleteApplication(id: string) {
  return prisma.ambassadorApplication.delete({ where: { id } });
}

// Côté public : ne plante jamais (listes vides si la base est indisponible).
export async function getPublicAmbassadors() {
  try {
    return await prisma.ambassador.findMany({ where: { isActive: true }, orderBy: displayOrder });
  } catch (error) {
    console.error("[community] getPublicAmbassadors a échoué :", error);
    return [];
  }
}

export async function getPublicStores() {
  try {
    return await prisma.store.findMany({ where: { isActive: true }, orderBy: displayOrder });
  } catch (error) {
    console.error("[community] getPublicStores a échoué :", error);
    return [];
  }
}

export function createApplication(input: Omit<ApplicationInput, "website">) {
  return prisma.ambassadorApplication.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      instagram: input.instagram,
      city: input.city,
      message: input.message,
    },
    select: { id: true },
  });
}

export function communityApiError(error: unknown, notFound = "Élément introuvable.") {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return { status: 404, message: notFound };
  }
  return { status: 500, message: "Une erreur inattendue est survenue." };
}
