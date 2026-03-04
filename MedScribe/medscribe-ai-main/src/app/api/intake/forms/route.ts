import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formType = request.nextUrl.searchParams.get("type");

    let query = supabase
      .from("intake_forms")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (formType) {
      query = query.eq("form_type", formType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch intake forms" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Intake forms GET error:", err);
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

    const body = await request.json();
    const { name, description, form_type, questions } = body;

    if (!name || !form_type || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "name, form_type, and questions array are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("intake_forms")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        form_type,
        questions,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create intake form" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Intake forms POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
