import { handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { deleteApplication, setApplicationStatus } from "@/lib/community-service";
import { applicationStatusSchema } from "@/lib/community-validation";
import { revalidateApplications } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Candidature introuvable." };

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/applications:status", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { status } = await parseJson(request, applicationStatusSchema, { message: "Statut invalide." });
    const application = await setApplicationStatus(id, status);
    revalidateApplications();
    return json({ application });
  }, messages);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/applications:delete", async () => {
    await requireApiStaff();
    await deleteApplication(await parseId(params, messages.notFound));
    revalidateApplications();
    return noContent();
  }, messages);
}
