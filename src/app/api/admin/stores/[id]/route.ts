import { ApiError, handleApi, json, noContent, parseId, parseJson, requireApiStaff } from "@/lib/api";
import { deleteAdminStore, getAdminStore, setAdminStoreStatus, updateAdminStore } from "@/lib/community-service";
import { activeStatusSchema, storeInputSchema } from "@/lib/community-validation";
import { revalidateStores } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Boutique introuvable." };

export async function GET(_request: Request, { params }: RouteContext) {
  return handleApi("admin/stores:get", async () => {
    await requireApiStaff();
    const store = await getAdminStore(await parseId(params, messages.notFound));
    if (!store) throw new ApiError(404, messages.notFound);
    return json({ store });
  }, messages);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handleApi("admin/stores:update", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const store = await updateAdminStore(id, await parseJson(request, storeInputSchema));
    revalidateStores();
    return json({ store });
  }, messages);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApi("admin/stores:status", async () => {
    await requireApiStaff();
    const id = await parseId(params, messages.notFound);
    const { isActive } = await parseJson(request, activeStatusSchema, { message: "Statut invalide." });
    const store = await setAdminStoreStatus(id, isActive);
    revalidateStores();
    return json({ store });
  }, messages);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/stores:delete", async () => {
    await requireApiStaff();
    await deleteAdminStore(await parseId(params, messages.notFound));
    revalidateStores();
    return noContent();
  }, messages);
}
