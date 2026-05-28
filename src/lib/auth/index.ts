import "server-only";

import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE_NAME } from "./config";
import { verifySessionToken } from "./tokens";
import { findUserById, findUserForAuth, type AppUser } from "@/lib/db/users";

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<AppUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await findUserForAuth(normalizedEmail);
  if (!user) {
    return null;
  }

  const matches = await compare(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  return user;
}

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const claims = await verifySessionToken(token);
  if (!claims) {
    return null;
  }

  const userId = Number(claims.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const user = await findUserById(userId);
  if (!user || user.status !== "active") {
    return null;
  }

  return user;
});

export async function requireAuthenticatedUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdminUser(): Promise<AppUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
