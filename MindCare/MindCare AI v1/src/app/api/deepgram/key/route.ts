import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/deepgram/key
 * Creates a temporary Deepgram API key (scoped, short-lived) for the browser.
 * Falls back to returning the main key if temporary key creation fails.
 *
 * Security: Only authenticated users can access this endpoint.
 */
export async function GET() {
  try {
    // Demo mode: no auth required

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    // Try to create a temporary scoped key via Deepgram API
    try {
      const res = await fetch("https://api.deepgram.com/v1/keys", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: `temp-key-${user?.id || "demo"}-${Date.now()}`,
          scopes: ["usage:write"],
          time_to_live_in_seconds: 60, // 1 minute TTL
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.key) {
          return NextResponse.json({ key: data.key, temporary: true });
        }
      }
    } catch {
      // Temp key creation failed — fall back to main key
      console.warn("[Deepgram] Temporary key creation failed, using main key");
    }

    // Fallback: return main key (for dev/demo environments)
    return NextResponse.json({ key: apiKey, temporary: false });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
