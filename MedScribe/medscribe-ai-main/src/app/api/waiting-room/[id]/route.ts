import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id, status, visit_type, metadata, created_at")
      .eq("id", id)
      .single();

    if (error || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    const metadata = (consultation.metadata || {}) as Record<string, unknown>;
    const status = consultation.status;

    // Determine waiting room status
    let waitingStatus: "waiting" | "in-progress" | "completed" = "waiting";
    if (status === "recording" || status === "transcribed" || status === "note_generated") {
      waitingStatus = "in-progress";
    } else if (status === "reviewed" || status === "finalized") {
      waitingStatus = "completed";
    }

    return NextResponse.json({
      consultation_id: consultation.id,
      status: waitingStatus,
      visit_type: consultation.visit_type,
      patient_name: metadata.patient_name || null,
      appointment_time: consultation.created_at,
      meet_link: waitingStatus === "in-progress" ? (metadata.meet_link || null) : null,
      doctor_name: "Dr. Diana Pirjol",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
