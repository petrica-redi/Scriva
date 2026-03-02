import { createClient } from "@/lib/supabase/server";
import { getProviderStatus } from "@/lib/ai/provider";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getProviderStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error("[AI Provider Status] Error", err);
    return NextResponse.json(
      { error: "Failed to load provider status" },
      { status: 500 }
    );
  }
}
