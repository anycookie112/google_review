import { requireAdminUser } from "@/lib/auth";
import { runReviewSync } from "@/lib/reviews/sync";
import { buildPathWithQuery, redirectToPath } from "@/lib/http/redirects";

export const runtime = "nodejs";

export async function POST() {
  const currentUser = await requireAdminUser();

  try {
    const result = await runReviewSync({
      triggerType: "manual",
      triggeredByUserId: currentUser.id,
    });

    if (result.status === "failed") {
      return redirectToPath(buildPathWithQuery("/admin/sync", { error: "sync_failed" }));
    }

    return redirectToPath(
      buildPathWithQuery("/admin/sync", {
        message: result.status === "partial" ? "partial" : "synced",
      }),
    );
  } catch {
    return redirectToPath(buildPathWithQuery("/admin/sync", { error: "sync_failed" }));
  }
}
