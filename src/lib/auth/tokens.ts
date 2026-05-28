import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret, type SessionClaims, SESSION_TTL_SECONDS } from "./config";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { sub, email, name, role } = payload;

    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof role !== "string"
    ) {
      return null;
    }

    return { sub, email, name, role };
  } catch {
    return null;
  }
}
