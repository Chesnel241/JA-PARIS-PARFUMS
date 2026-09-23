import { ApiError, handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { deleteAdminAmbassador, getAdminAmbassador, setAdminAmbassadorStatus, updateAdminAmbassador } from "@/lib/community-service";
import { activeStatusSchema, ambassadorInputSchema } from "@/lib/community-validation";
import { revalidateAmbassadors } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Ambassadrice introuvable." };

export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/ambassadors:get", async () => {
    await requireApiStaff();
    const ambassador = await getAdminAmbassador(await parseId(params, messages.notFound));
    if (!ambassador) throw new ApiError(404, messages.notFound);
    return json({ ambassador });
  }, messages);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handleApi("admin/ambassadors:update", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const ambassador = await updateAdminAmbassador(id, await parseJson(request, ambassadorInputSchema));
    revalidateAmbassadors();
    return json({ ambassador });
  }, messages);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/ambassadors:status", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { isActive } = await parseJson(request, activeStatusSchema, { message: "Statut invalide." });
    const ambassador = await setAdminAmbassadorStatus(id, isActive);
    revalidateAmbassadors();
    return json({ ambassador });
  }, messages);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/ambassadors:delete", async () => {
    await requireApiStaff();
    await deleteAdminAmbassador(await parseId(params, messages.notFound));
    revalidateAmbassadors();
    return noContent();
  }, messages);
}
