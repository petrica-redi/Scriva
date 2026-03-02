import { createClient } from "@/lib/supabase/server";
import { createConsultationSchema } from "@/lib/validators";
import { Consultation, ConsultationStatus } from "@/types";
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

    // Get pagination and filter parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status") as ConsultationStatus | null;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("consultations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: consultations, count, error } = await query;

    if (error) {
      console.error("[Consultations] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch consultations", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: consultations as Consultation[],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Consultations] GET error:", error);
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
    const validationResult = createConsultationSchema.safeParse(body);

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

    const { visit_type, patient_name, notes } = validationResult.data;

    // Create consultation
    const { data: consultation, error } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        visit_type,
        status: "scheduled",
        consent_given: false,
        metadata: {
          patient_name: patient_name || null,
          notes: notes || null,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("[Consultations] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create consultation", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(consultation as Consultation, { status: 201 });
  } catch (error) {
    console.error("[Consultations] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
