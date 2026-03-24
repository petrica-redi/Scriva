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

    // Request a short-lived JWT from Deepgram's token grant endpoint.
    // The JWT is valid for 30s by default, which is enough to open a WS.
    // Once the WS is open the connection stays alive regardless of TTL.
    const grantRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 90 }),
    });

    if (grantRes.ok) {
      const grant = (await grantRes.json()) as {
        access_token: string;
        expires_in: number;
      };
      return NextResponse.json({
        key: grant.access_token,
        auth_type: "bearer",
        expires_in: grant.expires_in,
        streaming_available: true,
        provider: "deepgram",
        ws_url: "wss://api.deepgram.com",
      });
    }

    // Fallback: if the grant endpoint fails (e.g. key lacks Member role),
    // return the raw API key so the client can use "token" protocol instead.
    console.warn(
      `[stream-key] Deepgram /auth/grant failed (${grantRes.status}), falling back to raw key`
    );
    return NextResponse.json({
      key: apiKey,
      auth_type: "token",
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
