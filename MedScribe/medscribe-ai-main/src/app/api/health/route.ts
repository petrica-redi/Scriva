import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Health check for load balancers and monitoring.
 * GET /api/health — no auth required.
 * Returns 200 with { status: "ok", db: "ok" } when DB is reachable.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { status: "degraded", db: "error", message: error.message },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
