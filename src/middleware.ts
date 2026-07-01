import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes (not the login page itself)
  if (pathname.startsWith("/admin")) {
    // Auth.js v5 prefixes the session cookie with __Secure- on HTTPS
    // (production). Missing those names redirects authenticated admins in a
    // loop between /admin and /connexion-admin.
    const token =
      request.cookies.get("__Secure-authjs.session-token")?.value ??
      request.cookies.get("authjs.session-token")?.value ??
      request.cookies.get("__Secure-next-auth.session-token")?.value ??
      request.cookies.get("next-auth.session-token")?.value;
    if (!token) {
      const loginUrl = new URL("/connexion-admin", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
