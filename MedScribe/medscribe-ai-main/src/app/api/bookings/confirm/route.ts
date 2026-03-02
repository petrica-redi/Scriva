import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { consultation_id } = await request.json();

    if (!consultation_id) {
      return NextResponse.json({ error: "consultation_id required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("consultations")
      .select("id, status, metadata, patient_id, visit_type")
      .eq("id", consultation_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Future: send confirmation email here
    return NextResponse.json({
      confirmed: true,
      consultation_id: data.id,
      status: data.status,
      visit_type: data.visit_type,
      metadata: data.metadata,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
