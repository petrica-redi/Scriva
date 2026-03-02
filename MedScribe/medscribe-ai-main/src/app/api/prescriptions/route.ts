import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { consultation_id, medications, notes, patient_email } = body;

    if (!consultation_id || !medications || !Array.isArray(medications)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Fetch consultation
    const { data: consultation, error: fetchError } = await supabase
      .from("consultations")
      .select("id, user_id, metadata")
      .eq("id", consultation_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const metadata = (consultation.metadata || {}) as Record<string, unknown>;
    const prescriptions = Array.isArray(metadata.prescriptions) ? metadata.prescriptions : [];

    const newPrescription = {
      id: crypto.randomUUID(),
      medications,
      notes: notes || "",
      patient_email: patient_email || null,
      created_at: new Date().toISOString(),
    };

    prescriptions.push(newPrescription);

    const { error: updateError } = await supabase
      .from("consultations")
      .update({ metadata: { ...metadata, prescriptions } })
      .eq("id", consultation_id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to save prescription" }, { status: 500 });
    }

    return NextResponse.json(newPrescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get("consultation_id");

    if (!consultationId) {
      return NextResponse.json({ error: "consultation_id required" }, { status: 400 });
    }

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("metadata")
      .eq("id", consultationId)
      .eq("user_id", user.id)
      .single();

    if (error || !consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
    }

    const metadata = (consultation.metadata || {}) as Record<string, unknown>;
    const prescriptions = Array.isArray(metadata.prescriptions) ? metadata.prescriptions : [];

    return NextResponse.json({ prescriptions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
