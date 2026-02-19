import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/utils/demo-auth";
import { createTemplateSchema } from "@/lib/validators";
import { NoteTemplate } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

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
      // Default: show system templates and user's own templates
      query = query.or(`is_system.eq.true,user_id.eq.${user.id}`);
    }

    const { data: templates, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch templates",
          code: "DATABASE_ERROR",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(templates as NoteTemplate[], { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

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
      return NextResponse.json(
        {
          error: "Failed to create template",
          code: "DATABASE_ERROR",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(template as NoteTemplate, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: message,
      },
      { status: 500 }
    );
  }
}
