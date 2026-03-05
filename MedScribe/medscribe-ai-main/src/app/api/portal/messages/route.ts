import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patient_id");
    if (!patientId) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    // Verify provider owns this patient
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("user_id", user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from("portal_messages")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Portal messages query error:", error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: messages || [] });
  } catch (err) {
    console.error("Portal messages GET error:", err);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patient_id, subject, body, parent_id } = await request.json();

    if (!patient_id || !body) {
      return NextResponse.json({ error: "patient_id and body are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("portal_messages")
      .insert({
        patient_id,
        sender_type: "provider",
        sender_id: user.id,
        subject: subject || null,
        body,
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Portal messages POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
