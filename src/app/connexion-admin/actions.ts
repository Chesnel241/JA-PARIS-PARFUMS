"use server";

import { headers } from "next/headers";
import { loginIdentifier } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";

// Doit rester aligné sur src/lib/login-rate-limit.ts (5 essais / 15 min).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type LoginThrottle = { blocked: boolean; retryInMinutes: number; remaining: number | null };

// Après un échec, indique si le couple e-mail + IP de l'appelant est bloqué et
// combien d'essais il reste : l'écran de connexion peut ainsi distinguer
// « identifiants invalides » et « trop de tentatives ». Ne révèle que l'état
// des propres tentatives de l'appelant.
export async function getLoginThrottle(email: string): Promise<LoginThrottle> {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || normalized.length > 254) return { blocked: false, retryInMinutes: 0, remaining: null };
  try {
    const incoming = await headers();
    const forwarded: Record<string, string> = {};
    const xff = incoming.get("x-forwarded-for");
    const cf = incoming.get("cf-connecting-ip");
    if (xff !== null) forwarded["x-forwarded-for"] = xff;
    if (cf !== null) forwarded["cf-connecting-ip"] = cf;
    const identifier = loginIdentifier(normalized, new Request("http://localhost/", { headers: forwarded }));
    const attempt = await prisma.loginAttempt.findUnique({ where: { identifier } });
    const now = Date.now();
    if (attempt?.blockedUntil && attempt.blockedUntil.getTime() > now) {
      return { blocked: true, retryInMinutes: Math.max(1, Math.ceil((attempt.blockedUntil.getTime() - now) / 60000)), remaining: 0 };
    }
    if (!attempt || now - attempt.windowStartedAt.getTime() > WINDOW_MS) return { blocked: false, retryInMinutes: 0, remaining: null };
    return { blocked: false, retryInMinutes: 0, remaining: Math.max(0, MAX_ATTEMPTS - attempt.attempts) };
  } catch {
    return { blocked: false, retryInMinutes: 0, remaining: null };
  }
}
