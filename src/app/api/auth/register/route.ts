import { NextResponse } from "next/server";
import { registerUserRequest } from "@/lib/db/users";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

function redirectToRegister(request: Request, params: Record<string, string>) {
  void request;
  return redirectToPath(buildPathWithQuery("/register", params), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!displayName || !email) {
    return redirectToRegister(request, {
      error: "missing_fields",
      name: displayName,
      email,
    });
  }

  try {
    const result = await registerUserRequest({ displayName, email });
    return redirectToPath(
      buildPathWithQuery("/register/status", { token: result.token }),
      303,
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "missing_fields";
    return redirectToRegister(request, {
      error: code,
      name: displayName,
      email,
    });
  }
}
