import { NextResponse } from "next/server";
import { loadReviewsPayload } from "@/lib/loadReviews";

// Always run server-side and never cache — the dashboard expects fresh data.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await loadReviewsPayload();
  const status = payload.errors.some((e) => e.storeId === "_global") ? 500 : 200;
  return NextResponse.json(payload, { status });
}
