// Défense en profondeur pour les formulaires publics : une requête modifiante
// envoyée depuis un autre site (Origin étranger) est refusée. Les navigateurs
// envoient toujours Origin sur un POST inter-sites ; son absence (client HTTP,
// même origine sur certains navigateurs) est acceptée.
export function isCrossSiteRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === "null") return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).host);
  } catch {
    // URL de requête toujours absolue côté Next.js ; ignoré par prudence.
  }
  for (const header of ["host", "x-forwarded-host"]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) allowed.add(value);
  }
  for (const url of [process.env.NEXT_PUBLIC_SITE_URL, process.env.AUTH_URL]) {
    try {
      if (url) allowed.add(new URL(url).host);
    } catch {
      // URL mal formée : ignorée (signalée par src/lib/env.ts).
    }
  }
  return !allowed.has(originHost);
}
