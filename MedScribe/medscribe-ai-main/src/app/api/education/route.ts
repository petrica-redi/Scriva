import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = request.nextUrl.searchParams.get("category");
    const conditionCode = request.nextUrl.searchParams.get("condition_code");
    const language = request.nextUrl.searchParams.get("language") || "en";

    let query = supabase
      .from("patient_education")
      .select("*")
      .eq("is_published", true)
      .eq("language", language);

    if (category) {
      query = query.eq("category", category);
    }

    if (conditionCode) {
      query = query.contains("condition_codes", [conditionCode]);
    }

    const { data, error } = await query.order("title", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch education content" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Education GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
