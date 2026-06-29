import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes (not the login page itself)
  if (pathname.startsWith("/admin")) {
    const token =
      request.cookies.get("authjs.session-token")?.value ??
      request.cookies.get("next-auth.session-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/connexion-admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
