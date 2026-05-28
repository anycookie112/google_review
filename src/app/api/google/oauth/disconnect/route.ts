import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteGoogleOAuthConnection } from "@/lib/db/googleConnection";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

function redirectToAdminGoogle(request: Request, params: Record<string, string>) {
  void request;
  return redirectToPath(buildPathWithQuery("/admin/google", params), 303);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return redirectToAdminGoogle(request, { error: "forbidden" });
  }

  await deleteGoogleOAuthConnection();
  return redirectToAdminGoogle(request, { message: "disconnected" });
}
