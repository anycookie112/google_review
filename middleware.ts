import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { sanitizeNextPath } from "@/lib/auth/paths";
import { verifySessionToken } from "@/lib/auth/tokens";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/register/status" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/activate"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAuthRoute(pathname)) {
    if (pathname === "/login" || pathname === "/register") {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      const claims = token ? await verifySessionToken(token) : null;

      if (claims) {
        return redirectToPath("/dashboard", 307);
      }
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (claims) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return redirectToPath(
    buildPathWithQuery("/login", {
      next: sanitizeNextPath(`${pathname}${search}`),
    }),
    307,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
