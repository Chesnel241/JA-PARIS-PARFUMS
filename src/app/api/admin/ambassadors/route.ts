import { handleApi, json, parseJson, requireApiStaff } from "@/lib/api";
import { createAdminAmbassador, listAdminAmbassadors } from "@/lib/community-service";
import { ambassadorInputSchema } from "@/lib/community-validation";
import { revalidateAmbassadors } from "@/lib/revalidate";

export async function GET() {
  return handleApi("admin/ambassadors:list", async () => {
    await requireApiStaff();
    return json({ ambassadors: await listAdminAmbassadors() });
  });
}

export async function POST(request: Request) {
  return handleApi("admin/ambassadors:create", async () => {
    await requireApiStaff();
    const ambassador = await createAdminAmbassador(await parseJson(request, ambassadorInputSchema));
    revalidateAmbassadors();
    return json({ ambassador }, { status: 201 });
  });
}
