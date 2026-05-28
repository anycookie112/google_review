import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  getGoogleOAuthStateCookieConfig,
  isGoogleOauthConfigured,
} from "@/lib/google/config";
import { buildGoogleAuthorizationUrl } from "@/lib/google/oauth";
import { signGoogleOAuthStateToken } from "@/lib/google/state";

export const runtime = "nodejs";

function redirectToAdminGoogle(request: Request, params: Record<string, string>) {
  void request;
  return redirectToPath(buildPathWithQuery("/admin/google", params), 303);
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return redirectToAdminGoogle(request, { error: "forbidden" });
  }

  if (!isGoogleOauthConfigured()) {
    return redirectToAdminGoogle(request, { error: "missing_config" });
  }

  const state = await signGoogleOAuthStateToken({
    sub: String(currentUser.id),
    nonce: randomBytes(16).toString("hex"),
  });

  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state), { status: 303 });
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
    state,
    getGoogleOAuthStateCookieConfig(),
  );

  return response;
}
