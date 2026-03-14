import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram not configured", streaming_available: false },
        { status: 503 }
      );
    }

    // Request a short-lived temporary key from Deepgram
    // so the main API key is never sent to the browser.
    try {
      const res = await fetch("https://api.deepgram.com/v1/keys/scoped", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({
          comment: `scriva-session-${user.id.substring(0, 8)}`,
          scopes: ["usage:write"],
          time_to_live_in_seconds: 300,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const tempKey = data.key || data.api_key;
        if (tempKey) {
          return NextResponse.json({
            key: tempKey,
            streaming_available: true,
            provider: "deepgram",
            ws_url: "wss://api.deepgram.com",
          });
        }
      }
    } catch {
      // Scoped key creation failed — fall back to main key.
      // This happens when the Deepgram plan doesn't support the keys API.
    }

    // Fallback: send the main key (less secure but functional)
    return NextResponse.json({
      key: apiKey,
      streaming_available: true,
      provider: "deepgram",
      ws_url: "wss://api.deepgram.com",
    });
  } catch (err) {
    console.error("[StreamKey] Error:", err);
    return NextResponse.json(
      { error: "Failed to get streaming key" },
      { status: 500 }
    );
  }
}
