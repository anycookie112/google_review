import type { JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "reviews_monitor_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionClaims extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function getAuthSecret(): string {
  const value = process.env.AUTH_SECRET?.trim();
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.example to .env and set a long random string.",
    );
  }
  if (value.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }
  return value;
}

export function getSessionCookieConfig() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
