import { z } from "zod";
import { handleApi, json, parseQuery, requireApiStaff } from "@/lib/api";
import { listApplications } from "@/lib/community-service";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

const STATUS_LABELS = { NEW: "Nouvelle", CONTACTED: "Contactée", ACCEPTED: "Acceptée", REJECTED: "Refusée" } as const;

const querySchema = z.object({
  // Vide, « all » ou absent = toutes les candidatures.
  status: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((value) => (value && value !== "ALL" ? value : undefined))
    .pipe(z.enum(["NEW", "CONTACTED", "ACCEPTED", "REJECTED"]).optional()),
  format: z.enum(["json", "csv"]).optional(),
});

// Liste des candidatures (JSON) ou export CSV (?format=csv).
export async function GET(request: Request) {
  return handleApi("admin/applications:list", async () => {
    await requireApiStaff();
    const { status, format } = parseQuery(request, querySchema);
    const applications = await listApplications(status);

    if (format === "csv") {
      return csvResponse(
        "candidatures-ambassadrices",
        toCsv(
          ["Date", "Prénom", "Nom", "E-mail", "Téléphone", "Instagram", "Ville", "Statut", "Message"],
          applications.map((application) => [
            csvDate(application.createdAt),
            application.firstName,
            application.lastName,
            application.email,
            application.phone,
            application.instagram,
            application.city,
            STATUS_LABELS[application.status],
            application.message,
          ]),
        ),
      );
    }

    return json({ applications });
  });
}
