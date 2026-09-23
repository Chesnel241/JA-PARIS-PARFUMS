// Client HTTP de l'admin : une seule façon d'appeler les API, des messages
// d'erreur en français et les erreurs de champ (422 `fields`) prêtes à afficher.

export type FieldErrors = Record<string, string>;

export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure = {
  ok: false;
  status: number;
  error: string;
  fieldErrors: FieldErrors;
  sessionExpired: boolean;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const ENGLISH_MESSAGE = /^(Too (small|big)|Invalid|Expected|Required|String must|Number must|Array must|Unrecognized)/i;

// Les messages de validation Zod sont en anglais : on les traduit. Les messages
// déjà rédigés en français par l'API (ex. « Le SKU est dupliqué. ») sont conservés.
export function translateIssue(message: string): string {
  if (!ENGLISH_MESSAGE.test(message)) return message;
  let match = message.match(/^Too small: expected string to have >=?(\d+) character/);
  if (match) return Number(match[1]) <= 1 ? "Ce champ est obligatoire." : `${match[1]} caractères minimum.`;
  match = message.match(/^Too big: expected string to have <=?(\d+) character/);
  if (match) return `${match[1]} caractères maximum.`;
  match = message.match(/^Too small: expected number to be >=?(-?\d+)/);
  if (match) return `La valeur doit être supérieure ou égale à ${match[1]}.`;
  match = message.match(/^Too big: expected number to be <=?(-?\d+)/);
  if (match) return `La valeur doit être inférieure ou égale à ${match[1]}.`;
  match = message.match(/^Too small: expected array to have >=?(\d+) item/);
  if (match) return Number(match[1]) <= 1 ? "Ajoutez au moins un élément." : `Ajoutez au moins ${match[1]} éléments.`;
  match = message.match(/^Too big: expected array to have <=?(\d+) item/);
  if (match) return `${match[1]} éléments maximum.`;
  if (/received undefined|received null|Required/i.test(message)) return "Ce champ est obligatoire.";
  if (/expected int/i.test(message)) return "Saisissez un nombre entier.";
  if (/expected number/i.test(message)) return "Saisissez un nombre.";
  if (/email/i.test(message)) return "Adresse e-mail invalide.";
  if (/pattern|Invalid string/i.test(message)) return "Format invalide.";
  if (/url/i.test(message)) return "Adresse invalide.";
  return "Valeur invalide.";
}

// Accepte le format `error.flatten()` de Zod ({ formErrors, fieldErrors }) ou un
// objet simple { champ: "message" | ["message"] } si l'API évolue.
export function extractFieldErrors(fields: unknown): FieldErrors {
  if (!fields || typeof fields !== "object") return {};
  const source = "fieldErrors" in fields && fields.fieldErrors && typeof fields.fieldErrors === "object"
    ? (fields.fieldErrors as Record<string, unknown>)
    : (fields as Record<string, unknown>);
  const result: FieldErrors = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "formErrors") continue;
    const first = Array.isArray(value) ? value.find((item) => typeof item === "string") : value;
    if (typeof first === "string" && first) result[key] = translateIssue(first);
  }
  return result;
}

function defaultMessage(status: number) {
  if (status === 401) return "Votre session a expiré. Reconnectez-vous pour continuer.";
  if (status === 403) return "Cette action est réservée aux administrateurs.";
  if (status === 404) return "Cet élément n'existe plus. Il a peut-être été supprimé entre-temps.";
  if (status === 409) return "Action impossible : conflit avec des données existantes.";
  if (status === 413) return "Fichier trop volumineux (4 Mo maximum).";
  if (status === 422) return "Certains champs sont invalides. Vérifiez le formulaire.";
  if (status === 429) return "Trop de requêtes. Patientez quelques instants.";
  return "Une erreur inattendue est survenue. Réessayez dans un instant.";
}

export async function adminRequest<T = unknown>(
  url: string,
  init: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; json?: unknown; body?: BodyInit } = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.json !== undefined ? { "content-type": "application/json", accept: "application/json" } : { accept: "application/json" },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.", fieldErrors: {}, sessionExpired: false };
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return { ok: true, status: response.status, data: payload as T };

  const body = (payload && typeof payload === "object" ? payload : {}) as { error?: unknown; message?: unknown; fields?: unknown };
  const apiMessage = typeof body.error === "string" ? body.error : typeof body.message === "string" ? body.message : "";
  const fieldErrors = extractFieldErrors(body.fields);
  const sessionExpired = response.status === 401;
  const error = sessionExpired
    ? defaultMessage(401)
    : apiMessage && apiMessage !== "Données invalides." ? translateIssue(apiMessage) : defaultMessage(response.status);
  return { ok: false, status: response.status, error, fieldErrors, sessionExpired };
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type UploadedAsset = { id: string; url: string; filename: string; size: number; mimeType: string };

// Vérifie le fichier avant l'envoi : retour immédiat plutôt qu'un aller-retour serveur.
export function checkImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `« ${file.name} » : format non pris en charge (JPEG, PNG, WebP, GIF ou AVIF).`;
  if (file.size === 0) return `« ${file.name} » est vide.`;
  if (file.size > MAX_IMAGE_BYTES) return `« ${file.name} » dépasse 4 Mo (${(file.size / 1024 / 1024).toFixed(1)} Mo). Compressez l'image avant de la téléverser.`;
  return null;
}

export async function uploadImage(file: File): Promise<ApiResult<UploadedAsset>> {
  const problem = checkImageFile(file);
  if (problem) return { ok: false, status: 422, error: problem, fieldErrors: {}, sessionExpired: false };
  const body = new FormData();
  body.append("file", file);
  const result = await adminRequest<{ asset: UploadedAsset }>("/api/admin/media", { method: "POST", body });
  if (!result.ok) return result;
  const asset = result.data?.asset;
  if (!asset?.url) return { ok: false, status: 500, error: "Réponse inattendue du serveur après le téléversement.", fieldErrors: {}, sessionExpired: false };
  return { ok: true, status: result.status, data: asset };
}

// Référence d'image acceptée par l'API : chemin relatif (/…) ou URL http(s).
export function isValidImageReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
