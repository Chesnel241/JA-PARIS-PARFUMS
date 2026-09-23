import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3000;

// Sonde de santé (monitoring / uptime) : aucun secret, jamais mise en cache.
// 200 si la base répond, 503 sinon (status « degraded »).
export async function GET() {
  let db: "ok" | "down" = "down";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`délai de ${DB_TIMEOUT_MS} ms dépassé`)), DB_TIMEOUT_MS);
      }),
    ]);
    db = "ok";
  } catch (error) {
    console.error("[api:health] base de données injoignable :", error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timer);
  }

  return Response.json(
    { status: db === "ok" ? "ok" : "degraded", db, time: new Date().toISOString() },
    { status: db === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
