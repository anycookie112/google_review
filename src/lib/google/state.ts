import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import {
  getGoogleOAuthSecretKey,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
} from "./config";

export interface GoogleOAuthStateClaims extends JWTPayload {
  sub: string;
  nonce: string;
}

export async function signGoogleOAuthStateToken(
  claims: GoogleOAuthStateClaims,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_OAUTH_STATE_TTL_SECONDS}s`)
    .sign(getGoogleOAuthSecretKey());
}

export async function verifyGoogleOAuthStateToken(
  token: string,
): Promise<GoogleOAuthStateClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getGoogleOAuthSecretKey());
    const { sub, nonce } = payload;

    if (typeof sub !== "string" || typeof nonce !== "string") {
      return null;
    }

    return { ...payload, sub, nonce };
  } catch {
    return null;
  }
}
