import { z } from "zod";
import { handleApi, json, parseQuery, requireApiStaff } from "@/lib/api";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";
import { listNewsletterSubscribers } from "@/lib/newsletter-service";

const querySchema = z.object({ format: z.enum(["json", "csv"]).optional() });

// Liste des inscrits (JSON) ou export CSV (?format=csv).
export async function GET(request: Request) {
  return handleApi("admin/newsletter:list", async () => {
    await requireApiStaff();
    const { format } = parseQuery(request, querySchema);
    const subscribers = await listNewsletterSubscribers();

    if (format === "csv") {
      return csvResponse(
        "newsletter-cercle-jae",
        toCsv(["E-mail", "Date d'inscription"], subscribers.map((subscriber) => [subscriber.email, csvDate(subscriber.createdAt)])),
      );
    }

    return json({ subscribers });
  });
}
