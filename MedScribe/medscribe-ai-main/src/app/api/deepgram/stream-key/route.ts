import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not set", streaming_available: false },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      key: apiKey,
      streaming_available: true,
      provider: "deepgram",
      ws_url: "wss://api.deepgram.com",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `stream-key error: ${err instanceof Error ? err.message : "unknown"}`,
        streaming_available: false,
      },
      { status: 500 }
    );
  }
}
