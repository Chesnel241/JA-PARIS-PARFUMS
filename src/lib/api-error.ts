// Erreur métier transportant un statut HTTP et un message destiné à
// l'utilisateur (en français). Levée par les services et les routes, elle est
// convertie en réponse JSON uniforme `{ error, ...extra }` par `handleApi`.
// Aucune dépendance à Next.js : importable depuis n'importe quel service.
export class ApiError extends Error {
  readonly status: number;
  readonly extra: Record<string, unknown>;
  readonly headers: Record<string, string>;

  constructor(status: number, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.extra = extra;
    this.headers = headers;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const API_MESSAGES = {
  unauthorized: "Non autorisé.",
  forbidden: "Réservé aux administrateurs.",
  invalid: "Données invalides.",
  invalidJson: "Le corps de la requête doit être un JSON valide.",
  payloadTooLarge: "La requête est trop volumineuse.",
  notFound: "Ressource introuvable.",
  conflict: "Conflit de données : cette valeur est déjà utilisée.",
  referenced: "Cet élément est encore utilisé ailleurs et ne peut pas être supprimé.",
  server: "Une erreur inattendue est survenue. Réessayez dans un instant.",
  unavailable: "Service momentanément indisponible. Réessayez dans un instant.",
} as const;
