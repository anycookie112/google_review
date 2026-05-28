import { NextResponse } from "next/server";
import { ensureAppDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureAppDatabase();
    return NextResponse.json({
      ok: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
