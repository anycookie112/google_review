import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getGoogleOAuthConnection,
  markGoogleOAuthValidationError,
  markGoogleOAuthValidationSuccess,
  upsertGoogleOAuthConnection,
} from "@/lib/db/googleConnection";
import {
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  getGoogleOAuthStateCookieConfig,
} from "@/lib/google/config";
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserProfile,
  listGoogleBusinessAccounts,
} from "@/lib/google/oauth";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";
import { verifyGoogleOAuthStateToken } from "@/lib/google/state";

export const runtime = "nodejs";

function redirectToAdminGoogle(request: Request, params: Record<string, string>) {
  void request;
  const response = redirectToPath(buildPathWithQuery("/admin/google", params), 303);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "", {
    ...getGoogleOAuthStateCookieConfig(),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return redirectToAdminGoogle(request, { error: "forbidden" });
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const state = url.searchParams.get("state")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim() ?? "";
  const storedState = cookies().get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value ?? "";

  if (oauthError) {
    return redirectToAdminGoogle(request, { error: "oauth_denied" });
  }

  if (!state || !storedState || state !== storedState) {
    return redirectToAdminGoogle(request, { error: "invalid_state" });
  }

  const stateClaims = await verifyGoogleOAuthStateToken(state);
  if (!stateClaims || stateClaims.sub !== String(currentUser.id) || !code) {
    return redirectToAdminGoogle(request, { error: "invalid_state" });
  }

  try {
    const existingConnection = await getGoogleOAuthConnection();
    const tokens = await exchangeGoogleCodeForTokens(code);
    const refreshToken = tokens.refreshToken ?? existingConnection?.refreshToken ?? null;

    if (!refreshToken) {
      return redirectToAdminGoogle(request, { error: "no_refresh_token" });
    }

    const profile = await fetchGoogleUserProfile(tokens.accessToken);

    await upsertGoogleOAuthConnection({
      googleUserId: profile.sub,
      googleEmail: profile.email,
      googleName: profile.name,
      scope: tokens.scope || existingConnection?.scope || "",
      refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.expiresAt,
      connectedByUserId: currentUser.id,
      lastError: null,
    });

    try {
      await listGoogleBusinessAccounts(tokens.accessToken);
      await markGoogleOAuthValidationSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Business account validation failed.";
      await markGoogleOAuthValidationError(message);
    }

    return redirectToAdminGoogle(request, { message: "connected" });
  } catch {
    return redirectToAdminGoogle(request, { error: "token_exchange_failed" });
  }
}
