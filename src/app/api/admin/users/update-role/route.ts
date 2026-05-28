import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserRole } from "@/lib/db/users";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";
import type { AppUserRole } from "@/types";

export const runtime = "nodejs";

function redirectWith(request: Request, params: Record<string, string>) {
  void request;
  return redirectToPath(buildPathWithQuery("/admin/users", params), 303);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return redirectWith(request, { error: "forbidden" });
  }

  const formData = await request.formData();
  const userId = Number(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "member") as AppUserRole;

  if (!Number.isInteger(userId) || userId <= 0) {
    return redirectWith(request, { error: "forbidden" });
  }

  if (role !== "admin" && role !== "member") {
    return redirectWith(request, { error: "invalid_role" });
  }

  try {
    await updateUserRole({ userId, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "forbidden";
    return redirectWith(request, { error: message });
  }

  return redirectWith(request, { message: "role_updated" });
}
