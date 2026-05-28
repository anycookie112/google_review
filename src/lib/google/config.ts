import { getAuthSecret } from "@/lib/auth/config";

export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "reviews_monitor_google_oauth_state";
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 60 * 10;

const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/business.manage",
] as const;

export function isGoogleOauthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REDIRECT_URI?.trim(),
  );
}

export function getGoogleOauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [...GOOGLE_OAUTH_SCOPES],
  };
}

export function getGoogleOAuthStateCookieConfig() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
  };
}

export function getGoogleOAuthSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}
