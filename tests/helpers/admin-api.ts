import type { APIRequestContext } from "@playwright/test";
import { expectStatus } from "./factories";

// Lectures d'état via l'API d'administration (plutôt que via l'UI, qui change).

export type Application = { id: string; email: string; status: string; firstName: string; lastName: string };

export async function findApplications(adminRequest: APIRequestContext, email: string): Promise<Application[]> {
  const response = await adminRequest.get("/api/admin/applications");
  await expectStatus(response, 200, "liste des candidatures");
  const { applications } = (await response.json()) as { applications: Application[] };
  return applications.filter((application) => application.email === email.toLowerCase());
}

export async function findSubscribers(adminRequest: APIRequestContext, email: string) {
  const response = await adminRequest.get("/api/admin/newsletter");
  await expectStatus(response, 200, "liste des inscrits newsletter");
  const { subscribers } = (await response.json()) as { subscribers: { id: string; email: string }[] };
  return subscribers.filter((subscriber) => subscriber.email === email.toLowerCase());
}

export async function uploadMedia(
  adminRequest: APIRequestContext,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  return adminRequest.post("/api/admin/media", { multipart: { file } });
}
