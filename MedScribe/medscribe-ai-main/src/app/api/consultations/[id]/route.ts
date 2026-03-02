import { createClient } from "@/lib/supabase/server";
import { updateConsultationSchema } from "@/lib/validators";
import { ConsultationWithRelations } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Fetch consultation with relations
    const { data: consultation, error } = await supabase
      .from("consultations")
      .select(
        `
        *,
        transcripts(*),
        clinical_notes(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const result: ConsultationWithRelations = {
      ...consultation,
      transcript: consultation.transcripts?.[0] || null,
      clinical_notes: consultation.clinical_notes || [],
    };

    return NextResponse.json(result, { status: 200 });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateConsultationSchema.safeParse(body);

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

    const { status, metadata } = validationResult.data;

    // Verify consultation ownership
    const { data: consultation, error: fetchError } = await supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (consultation.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Update consultation
    const { data: updated, error: updateError } = await supabase
      .from("consultations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update consultation",
          code: "DATABASE_ERROR",
          details: updateError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify consultation ownership
    const { data: consultation, error: fetchError } = await supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (consultation.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Delete consultation directly. Related transcripts/notes are removed via FK cascade.
    const { error: deleteError } = await supabase
      .from("consultations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete consultation",
          code: "DATABASE_ERROR",
          details: deleteError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Consultation deleted successfully" },
      { status: 200 }
    );
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
