import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectUserRequest } from "@/lib/db/users";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

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

  if (!Number.isInteger(userId) || userId <= 0) {
    return redirectWith(request, { error: "forbidden" });
  }

  await rejectUserRequest({ userId });
  return redirectWith(request, { message: "rejected" });
}
