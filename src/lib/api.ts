import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import "@/lib/zod-fr";
import { API_MESSAGES, ApiError } from "@/lib/api-error";
import { getCurrentStaff } from "@/lib/current-staff";

export { API_MESSAGES, ApiError } from "@/lib/api-error";

// ---------------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------------

// Les réponses d'API ne doivent jamais être mises en cache (données privées de
// l'admin, stock, commandes).
const NO_STORE = "no-store";

export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { "Cache-Control": NO_STORE, ...init.headers } });
}

export function noContent() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": NO_STORE } });
}

// Format d'erreur uniforme : { error: string, fields?: {...}, ...extra }.
export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": NO_STORE, ...headers } });
}

// ---------------------------------------------------------------------------
// Lecture et validation des entrées
// ---------------------------------------------------------------------------

export const MAX_JSON_BYTES = 1024 * 1024; // 1 Mo : largement assez pour un article.

export function flattenZodError(error: z.ZodError) {
  return z.flattenError(error);
}

// Premier message d'erreur lisible (pour les formulaires publics qui
// affichent simplement `error`).
export function firstIssueMessage(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_JSON_BYTES) throw new ApiError(413, API_MESSAGES.payloadTooLarge);

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new ApiError(422, API_MESSAGES.invalidJson);
  }
  if (text.length > MAX_JSON_BYTES) throw new ApiError(413, API_MESSAGES.payloadTooLarge);
  if (!text.trim()) throw new ApiError(422, API_MESSAGES.invalidJson);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(422, API_MESSAGES.invalidJson);
  }
}

type ParseOptions = {
  // Message principal renvoyé dans `error` (défaut : « Données invalides. »).
  message?: string;
  // true : `error` reprend le premier message de validation (formulaires publics).
  useFirstIssue?: boolean;
};

export function validate<S extends z.ZodType>(schema: S, value: unknown, options: ParseOptions = {}): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const fallback = options.message ?? API_MESSAGES.invalid;
    const message = options.useFirstIssue ? firstIssueMessage(parsed.error, fallback) : fallback;
    throw new ApiError(422, message, { fields: flattenZodError(parsed.error) });
  }
  return parsed.data;
}

export async function parseJson<S extends z.ZodType>(request: Request, schema: S, options: ParseOptions = {}): Promise<z.output<S>> {
  return validate(schema, await readJsonBody(request), options);
}

export function parseQuery<S extends z.ZodType>(request: Request, schema: S, options: ParseOptions = {}): z.output<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return validate(schema, params, { message: "Paramètres de requête invalides.", ...options });
}

// Identifiants Prisma (cuid) : on refuse tout ce qui n'y ressemble pas avant
// même d'interroger la base (404 propre, jamais d'exception Prisma brute).
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export async function parseId(params: Promise<{ id: string }>, notFoundMessage: string = API_MESSAGES.notFound) {
  const { id } = await params;
  if (!isValidId(id)) throw new ApiError(404, notFoundMessage);
  return id;
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

export async function requireApiStaff(options: { adminOnly?: boolean } = {}) {
  const staff = await getCurrentStaff();
  if (!staff) throw new ApiError(401, API_MESSAGES.unauthorized);
  if (options.adminOnly && staff.role !== Role.ADMIN) throw new ApiError(403, API_MESSAGES.forbidden);
  return staff;
}

// ---------------------------------------------------------------------------
// Gestion centralisée des erreurs
// ---------------------------------------------------------------------------

export type ErrorMessages = {
  notFound?: string; // P2025
  conflict?: string | ((error: Prisma.PrismaClientKnownRequestError) => string); // P2002
  referenced?: string; // P2003
};

const UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

export function isDatabaseUnavailable(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError
    || (error instanceof Prisma.PrismaClientKnownRequestError && UNAVAILABLE_CODES.has(error.code))
    || error instanceof Prisma.PrismaClientRustPanicError;
}

export function toErrorResponse(label: string, error: unknown, messages: ErrorMessages = {}) {
  if (error instanceof ApiError) return jsonError(error.status, error.message, error.extra, error.headers);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return jsonError(404, messages.notFound ?? API_MESSAGES.notFound);
    if (error.code === "P2002") {
      const conflict = typeof messages.conflict === "function" ? messages.conflict(error) : messages.conflict;
      return jsonError(409, conflict ?? API_MESSAGES.conflict);
    }
    if (error.code === "P2003") return jsonError(409, messages.referenced ?? API_MESSAGES.referenced);
  }

  if (isDatabaseUnavailable(error)) {
    console.error(`[api:${label}] base de données indisponible :`, error);
    return jsonError(503, API_MESSAGES.unavailable, {}, { "Retry-After": "5" });
  }

  console.error(`[api:${label}] erreur inattendue :`, error);
  return jsonError(500, API_MESSAGES.server);
}

// Exécute un handler de route et convertit TOUTE exception en réponse JSON
// maîtrisée (jamais de stack ni de message Prisma renvoyé au client).
export async function handleApi(label: string, handler: () => Promise<Response>, messages: ErrorMessages = {}): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(label, error, messages);
  }
}
