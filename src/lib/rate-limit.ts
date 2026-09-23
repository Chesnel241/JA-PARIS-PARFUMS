import { createHash } from "crypto";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

// Limiteur de débit adossé à PostgreSQL (table RateLimitBucket).
//
// Sur Vercel, chaque requête peut être servie par une instance différente :
// un compteur en mémoire ne protégerait rien. Ici, un seul `INSERT … ON
// CONFLICT DO UPDATE` atomique incrémente le compteur de la fenêtre courante
// (fenêtre fixe) : aucune course possible entre instances.
//
// Échec « ouvert » : si la base du limiteur est indisponible ou lente, la
// requête est AUTORISÉE (on ne bloque jamais une vente à cause du limiteur).

export type RateLimitRule = { scope: string; limit: number; windowMs: number };

export const RATE_LIMITS = {
  // Création de commande : 10 commandes / 10 min / IP.
  orders: { scope: "orders", limit: 10, windowMs: 10 * 60 * 1000 },
  // Candidatures « Devenir ambassadrice » : 5 / heure / IP.
  applications: { scope: "applications", limit: 5, windowMs: 60 * 60 * 1000 },
  // Inscriptions newsletter : 10 / heure / IP.
  newsletter: { scope: "newsletter", limit: 10, windowMs: 60 * 60 * 1000 },
  // Tentatives de connexion admin, toutes adresses e-mail confondues :
  // 30 / 15 min / IP (en plus du verrou 5 échecs par e-mail + IP).
  loginIp: { scope: "login-ip", limit: 30, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const LIMITER_TIMEOUT_MS = 2000;

// Adresse IP du client. Sur Vercel, `x-real-ip` et `x-forwarded-for` sont
// posés par la plateforme (valeurs fournies par le client écrasées).
export function getClientIp(source: Request | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;
  const candidates = [
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("cf-connecting-ip"),
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && value.length <= 64) return value;
  }
  return "unknown";
}

// L'IP n'est jamais stockée en clair (RGPD) : empreinte SHA-256 tronquée.
export function rateLimitKey(scope: string, identifier: string) {
  return `${scope}:${createHash("sha256").update(identifier).digest("hex").slice(0, 32)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`délai de ${ms} ms dépassé`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

// Purge occasionnelle des compteurs expirés (≈ 1 appel sur 50).
async function maybePurgeExpiredBuckets() {
  if (Math.random() > 0.02) return;
  try {
    await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "expiresAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'`;
  } catch (error) {
    console.error("[rate-limit] purge des compteurs expirés impossible :", error);
  }
}

export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const key = rateLimitKey(rule.scope, identifier);
  const windowSeconds = rule.windowMs / 1000;

  try {
    // Les horodatages sont manipulés en UTC « sans fuseau », comme Prisma.
    const rows = await withTimeout(prisma.$queryRaw<{ count: number; retryAfter: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
      VALUES (
        ${key}, 1,
        NOW() AT TIME ZONE 'UTC',
        (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}::double precision)
      )
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitBucket"."expiresAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN NOW() AT TIME ZONE 'UTC' ELSE "RateLimitBucket"."windowStart" END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}::double precision)
          ELSE "RateLimitBucket"."expiresAt" END
      RETURNING
        "count",
        GREATEST(CEIL(EXTRACT(EPOCH FROM ("expiresAt" - (NOW() AT TIME ZONE 'UTC')))), 1)::int AS "retryAfter"
    `, LIMITER_TIMEOUT_MS);

    void maybePurgeExpiredBuckets();

    const row = rows[0];
    if (!row) return { allowed: true, limit: rule.limit, remaining: rule.limit, retryAfterSeconds: 0 };
    const count = Number(row.count);
    const allowed = count <= rule.limit;
    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(rule.limit - count, 0),
      retryAfterSeconds: allowed ? 0 : Number(row.retryAfter),
    };
  } catch (error) {
    console.error(`[rate-limit] limiteur « ${rule.scope} » indisponible, requête autorisée :`, error);
    return { allowed: true, limit: rule.limit, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

export function formatRetryDelay(seconds: number) {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// Consomme une unité et lève une ApiError 429 (avec Retry-After) si la limite
// est dépassée. À utiliser dans `handleApi`.
export async function enforceRateLimit(request: Request, rule: RateLimitRule, message = "Trop de demandes en peu de temps.") {
  const result = await consumeRateLimit(rule, getClientIp(request));
  if (!result.allowed) {
    throw new ApiError(
      429,
      `${message} Merci de réessayer dans ${formatRetryDelay(result.retryAfterSeconds)}.`,
      { retryAfter: result.retryAfterSeconds },
      {
        "Retry-After": String(result.retryAfterSeconds),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": "0",
      },
    );
  }
  return result;
}
