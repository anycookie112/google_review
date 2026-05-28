import { NextResponse } from "next/server";
import { completeUserSetup } from "@/lib/db/users";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

function redirectToStatus(request: Request, token: string, error: string) {
  void request;
  return redirectToPath(
    buildPathWithQuery("/register/status", { token, error }),
    303,
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const token = String(formData.get("token") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !displayName || !password || !confirmPassword) {
    return redirectToStatus(request, token, "missing_fields");
  }

  if (password !== confirmPassword) {
    return redirectToStatus(request, token, "password_mismatch");
  }

  if (password.length < 8) {
    return redirectToStatus(request, token, "weak_password");
  }

  try {
    await completeUserSetup({ registrationToken: token, displayName, password });
    return redirectToPath("/login?message=account_ready", 303);
  } catch (error) {
    const code = error instanceof Error ? error.message : "not_ready";
    return redirectToStatus(request, token, code);
  }
}
