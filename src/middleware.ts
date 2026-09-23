import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware léger (runtime Edge) : aucune dépendance à Prisma ni à Auth.js.
// Il ne fait qu'un premier filtrage sur la PRÉSENCE du cookie de session ;
// la vérification réelle (signature JWT, compte actif, rôle) est faite côté
// serveur par requireStaff() (pages) et requireApiStaff() (API).

// Auth.js v5 préfixe le cookie par __Secure- en HTTPS (production) et peut le
// découper en morceaux (.0, .1…) s'il dépasse 4 Ko.
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

// Doit rester identique à ADMIN_PATH_HEADER (src/lib/auth-guard.ts), non
// importé ici pour garder le middleware indépendant de next/headers.
const ADMIN_PATH_HEADER = "x-jae-pathname";

function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.get(name)?.value || request.cookies.get(`${name}.0`)?.value);
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Protection CSRF en profondeur pour l'API admin : une requête modifiante
// portant un en-tête Origin d'un autre site est refusée (les cookies
// SameSite=Lax bloquent déjà l'essentiel des attaques).
function isCrossSiteRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return origin === "null";
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const allowedHosts = new Set<string>([request.nextUrl.host]);
  for (const header of ["host", "x-forwarded-host"]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) allowedHosts.add(value);
  }
  for (const url of [process.env.NEXT_PUBLIC_SITE_URL, process.env.AUTH_URL]) {
    try {
      if (url) allowedHosts.add(new URL(url).host);
    } catch {
      // URL mal formée : ignorée (signalée par src/lib/env.ts).
    }
  }
  return !allowedHosts.has(originHost);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    if (!hasSessionCookie(request)) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (UNSAFE_METHODS.has(request.method) && isCrossSiteRequest(request)) {
      return NextResponse.json({ error: "Requête refusée (origine non autorisée)." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const currentPath = `${pathname}${search}`;
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL("/connexion-admin", request.url);
      loginUrl.searchParams.set("callbackUrl", currentPath);
      return NextResponse.redirect(loginUrl);
    }
    // Transmet le chemin courant aux Server Components (requireStaff) pour
    // une redirection de connexion qui ramène au bon écran.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ADMIN_PATH_HEADER, currentPath);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
