import { handleApi, json, parseJson, requireApiStaff } from "@/lib/api";
import { createAdminStore, listAdminStores } from "@/lib/community-service";
import { storeInputSchema } from "@/lib/community-validation";
import { revalidateStores } from "@/lib/revalidate";

export async function GET() {
  return handleApi("admin/stores:list", async () => {
    await requireApiStaff();
    return json({ stores: await listAdminStores() });
  });
}

export async function POST(request: Request) {
  return handleApi("admin/stores:create", async () => {
    await requireApiStaff();
    const store = await createAdminStore(await parseJson(request, storeInputSchema));
    revalidateStores();
    return json({ store }, { status: 201 });
  });
}
