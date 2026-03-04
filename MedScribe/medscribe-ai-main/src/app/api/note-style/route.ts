import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("note_style_preferences")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ preferences: profile?.note_style_preferences || {} });
  } catch (err) {
    console.error("Note style GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { preferences } = await request.json();

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "preferences object is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .update({ note_style_preferences: preferences })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ message: "Preferences saved", preferences });
  } catch (err) {
    console.error("Note style POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
