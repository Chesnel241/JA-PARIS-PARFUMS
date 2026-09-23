import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

// Verrou anti-force brute de la connexion admin : 5 échecs par couple
// (e-mail, IP) → blocage 15 minutes. Complété par une limite globale par IP
// (RATE_LIMITS.loginIp) appliquée dans src/auth.ts.
export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export function loginIdentifier(email: string, request: Request) {
  return createHash("sha256")
    .update(`${email}:${getClientIp(request)}`)
    .digest("hex");
}

export async function isLoginAllowed(identifier: string) {
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier } });
  if (!attempt?.blockedUntil) return true;
  return attempt.blockedUntil <= new Date();
}

// Incrément atomique (une seule requête) : des tentatives parallèles ne
// peuvent pas « se marcher dessus » et dépasser la limite.
export async function recordFailedLogin(identifier: string) {
  const windowSeconds = WINDOW_MS / 1000;
  await prisma.$executeRaw`
    INSERT INTO "LoginAttempt" ("identifier", "attempts", "windowStartedAt", "blockedUntil", "updatedAt")
    VALUES (
      ${identifier}, 1, NOW() AT TIME ZONE 'UTC',
      CASE WHEN 1 >= ${MAX_ATTEMPTS} THEN (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}::double precision) ELSE NULL END,
      NOW() AT TIME ZONE 'UTC'
    )
    ON CONFLICT ("identifier") DO UPDATE SET
      "attempts" = CASE
        WHEN (NOW() AT TIME ZONE 'UTC') - "LoginAttempt"."windowStartedAt" > make_interval(secs => ${windowSeconds}::double precision) THEN 1
        ELSE "LoginAttempt"."attempts" + 1 END,
      "windowStartedAt" = CASE
        WHEN (NOW() AT TIME ZONE 'UTC') - "LoginAttempt"."windowStartedAt" > make_interval(secs => ${windowSeconds}::double precision) THEN NOW() AT TIME ZONE 'UTC'
        ELSE "LoginAttempt"."windowStartedAt" END,
      "blockedUntil" = CASE
        WHEN (NOW() AT TIME ZONE 'UTC') - "LoginAttempt"."windowStartedAt" > make_interval(secs => ${windowSeconds}::double precision) THEN
          CASE WHEN 1 >= ${MAX_ATTEMPTS} THEN (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}::double precision) ELSE NULL END
        WHEN "LoginAttempt"."attempts" + 1 >= ${MAX_ATTEMPTS} THEN (NOW() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}::double precision)
        ELSE NULL END,
      "updatedAt" = NOW() AT TIME ZONE 'UTC'
  `;
}

export async function clearFailedLogins(identifier: string) {
  await prisma.loginAttempt.deleteMany({ where: { identifier } });
}
