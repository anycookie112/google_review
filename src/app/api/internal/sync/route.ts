import { NextResponse } from "next/server";
import { runReviewSync } from "@/lib/reviews/sync";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.SYNC_CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-sync-secret") === secret;
}

export async function POST(request: Request) {
  if (!process.env.SYNC_CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "SYNC_CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReviewSync({
      triggerType: "scheduled",
      triggeredByUserId: null,
    });

    return NextResponse.json(
      {
        ok: result.status !== "failed",
        status: result.status,
        mode: result.providerMode,
        storesTotal: result.storesTotal,
        storesSucceeded: result.storesSucceeded,
        storesFailed: result.storesFailed,
        reviewsUpserted: result.reviewsUpserted,
        errors: result.errors,
      },
      { status: result.status === "failed" ? 500 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
