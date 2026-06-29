import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("cf-connecting-ip")
    ?? "unknown";
}

export function loginIdentifier(email: string, request: Request) {
  return createHash("sha256")
    .update(`${email}:${clientAddress(request)}`)
    .digest("hex");
}

export async function isLoginAllowed(identifier: string) {
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier } });
  if (!attempt?.blockedUntil) return true;
  return attempt.blockedUntil <= new Date();
}

export async function recordFailedLogin(identifier: string) {
  const now = new Date();
  const attempt = await prisma.loginAttempt.findUnique({ where: { identifier } });
  const windowExpired = !attempt || now.getTime() - attempt.windowStartedAt.getTime() > WINDOW_MS;
  const attempts = windowExpired ? 1 : attempt.attempts + 1;

  await prisma.loginAttempt.upsert({
    where: { identifier },
    create: {
      identifier,
      attempts,
      windowStartedAt: now,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + WINDOW_MS) : null,
    },
    update: {
      attempts,
      windowStartedAt: windowExpired ? now : attempt.windowStartedAt,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + WINDOW_MS) : null,
    },
  });
}

export async function clearFailedLogins(identifier: string) {
  await prisma.loginAttempt.deleteMany({ where: { identifier } });
}
