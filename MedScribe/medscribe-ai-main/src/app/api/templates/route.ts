import { createClient } from "@/lib/supabase/server";
import { createTemplateSchema } from "@/lib/validators";
import { NoteTemplate } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get filter parameters
    const searchParams = request.nextUrl.searchParams;
    const filterType = searchParams.get("filter") as
      | "system"
      | "user"
      | "published"
      | null;

    let query = supabase
      .from("note_templates")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters
    if (filterType === "system") {
      query = query.eq("is_system", true);
    } else if (filterType === "user") {
      query = query.eq("user_id", user.id);
    } else if (filterType === "published") {
      query = query.eq("is_published", true);
    } else {
      query = query.or(`is_system.eq.true,user_id.eq.${user.id.replace(/[^a-f0-9-]/gi, "")}`);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error("[Templates] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(templates as NoteTemplate[], { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, description, specialty, sections } = validationResult.data;

    // Create template
    const { data: template, error } = await supabase
      .from("note_templates")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        specialty: specialty || null,
        sections,
        is_system: false,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[Templates] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create template", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(template as NoteTemplate, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
