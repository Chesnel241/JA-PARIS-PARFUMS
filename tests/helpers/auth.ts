import { expect, type APIRequestContext } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./env";

export type CredentialsAttempt = {
  /** true si Auth.js a ouvert une session (pas de paramètre `error=` dans l'URL retournée). */
  ok: boolean;
  status: number;
  url: string;
};

/**
 * Connexion par l'API Auth.js v5 (provider Credentials), sans navigateur :
 * GET /api/auth/csrf → POST /api/auth/callback/credentials (form-urlencoded).
 * Les cookies (dont `authjs.session-token`) restent dans le contexte `request`.
 *
 * `forwardedFor` fixe l'en-tête x-forwarded-for : la limitation de tentatives
 * étant calculée par email + IP, un test qui provoque des échecs DOIT utiliser
 * une IP unique pour ne pas bloquer le compte admin des autres tests.
 */
export async function signInWithCredentials(
  request: APIRequestContext,
  { email = ADMIN_EMAIL, password = ADMIN_PASSWORD, forwardedFor }: { email?: string; password?: string; forwardedFor?: string } = {},
): Promise<CredentialsAttempt> {
  // x-real-ip est lu en priorité par le serveur (voir src/lib/rate-limit.ts) : on pose les deux.
  const forwarded = forwardedFor ? { "x-forwarded-for": forwardedFor, "x-real-ip": forwardedFor } : undefined;
  const csrfResponse = await request.get("/api/auth/csrf", { headers: forwarded });
  expect(csrfResponse.status(), "GET /api/auth/csrf").toBe(200);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await request.post("/api/auth/callback/credentials", {
    form: { email, password, csrfToken },
    // Demande à Auth.js une réponse JSON { url } plutôt qu'une redirection 302.
    headers: { "x-auth-return-redirect": "1", ...forwarded },
    maxRedirects: 0,
  });
  const body = await response.text();
  let url = response.headers()["location"] ?? "";
  try {
    url = (JSON.parse(body) as { url?: string }).url ?? url;
  } catch {
    // Réponse non JSON (redirection) : on garde l'en-tête Location.
  }
  return { ok: response.status() < 400 && !/[?&]error=/.test(url), status: response.status(), url };
}

/** Connexion admin qui doit réussir (sinon le test échoue avec un message clair). */
export async function loginAsAdmin(request: APIRequestContext, forwardedFor?: string) {
  const attempt = await signInWithCredentials(request, { forwardedFor });
  expect(attempt.ok, `connexion admin refusée (${attempt.status} ${attempt.url}) — vérifier ADMIN_EMAIL/ADMIN_PASSWORD et le seed`).toBe(true);
  const session = await request.get("/api/auth/session");
  const data = (await session.json()) as { user?: { email?: string; role?: string } } | null;
  expect(data?.user?.email).toBe(ADMIN_EMAIL);
  return data;
}

/** IP fictive unique (plage privée 10.0.0.0/8, ~16 M valeurs), pour isoler le rate limit. */
export function uniqueForwardedFor() {
  const n = () => Math.floor(Math.random() * 254) + 1;
  return `10.${n()}.${n()}.${n()}`;
}
