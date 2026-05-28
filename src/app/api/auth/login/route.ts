import { NextResponse } from "next/server";
import { verifyUserCredentials } from "@/lib/auth";
import { SESSION_COOKIE_NAME, getSessionCookieConfig } from "@/lib/auth/config";
import { sanitizeNextPath } from "@/lib/auth/paths";
import { signSessionToken } from "@/lib/auth/tokens";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

function redirectToLogin(request: Request, error: string, nextPath: string) {
  void request;
  return redirectToPath(
    buildPathWithQuery("/login", {
      error,
      next: nextPath !== "/" ? nextPath : undefined,
    }),
    303,
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/"));

  if (!email || !password) {
    return redirectToLogin(request, "missing_credentials", nextPath);
  }

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return redirectToLogin(request, "invalid_credentials", nextPath);
  }

  const token = await signSessionToken({
    sub: String(user.id),
    email: user.email,
    name: user.displayName,
    role: user.role,
  });

  const response = redirectToPath(nextPath, 303);
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieConfig());
  return response;
}
