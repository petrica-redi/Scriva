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
