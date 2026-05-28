import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieConfig } from "@/lib/auth/config";
import { redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

export async function POST(request: Request) {
  void request;
  const response = redirectToPath("/login", 303);

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieConfig(),
    maxAge: 0,
  });

  return response;
}
