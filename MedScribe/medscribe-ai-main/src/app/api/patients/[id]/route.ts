import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/patients/:id — Get a single patient
 * PATCH /api/patients/:id — Update a patient
 * DELETE /api/patients/:id — Delete a patient
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Also fetch consultations for this patient
    const { data: consultations } = await supabase
      .from("consultations")
      .select("id, visit_type, status, created_at, metadata")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ ...data, consultations: consultations || [] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { full_name, mrn, date_of_birth, gender, contact_info } = body;

    const updateData: Record<string, unknown> = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (mrn !== undefined) updateData.mrn = mrn;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (contact_info !== undefined) updateData.contact_info = contact_info;

    const { data, error } = await supabase
      .from("patients")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ message: "Patient deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
