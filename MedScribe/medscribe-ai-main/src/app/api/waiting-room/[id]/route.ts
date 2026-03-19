import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Public endpoint (patients check status) — rate limit by IP instead of auth
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`waiting-room:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    // Validate UUID format to prevent enumeration attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid consultation ID" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("id, status, visit_type, metadata, created_at, user_id")
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

    // Fetch doctor's display name from their profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", consultation.user_id)
      .single();

    const rawName = profile?.full_name || "Your Doctor";
    const doctorName = rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`;

    return NextResponse.json({
      consultation_id: consultation.id,
      status: waitingStatus,
      visit_type: consultation.visit_type,
      patient_name: metadata.patient_name || null,
      appointment_time: consultation.created_at,
      meet_link: waitingStatus === "in-progress" ? (metadata.meet_link || null) : null,
      doctor_name: doctorName,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
