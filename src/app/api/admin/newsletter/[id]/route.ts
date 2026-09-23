import { handleApi, noContent, parseId, requireApiStaff } from "@/lib/api";
import { deleteNewsletterSubscriber } from "@/lib/newsletter-service";
import { revalidateNewsletter } from "@/lib/revalidate";

type RouteContext = { params: Promise<{ id: string }> };

const messages = { notFound: "Inscrit introuvable." };

// Désinscription d'une adresse (demande RGPD, adresse erronée…).
export async function DELETE(_request: Request, { params }: RouteContext) {
  return handleApi("admin/newsletter:delete", async () => {
    await requireApiStaff();
    await deleteNewsletterSubscriber(await parseId(params, messages.notFound));
    revalidateNewsletter();
    return noContent();
  }, messages);
}
