import { createClient } from "@/lib/supabase/server";
import { NoteTemplate } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    const { data: template, error } = await supabase
      .from("note_templates")
      .select("*")
      .eq("id", id)
      .or(`is_system.eq.true,user_id.eq.${user.id.replace(/[^a-f0-9-]/gi, "")}`)
      .single();

    if (error || !template) {
      if (error?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      console.error("[Templates] Get by id error:", error);
      return NextResponse.json(
        { error: "Failed to fetch template", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(template as NoteTemplate, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
