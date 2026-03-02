import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALL_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch booked slots for this date
  const { data: booked } = await supabase
    .from("consultations")
    .select("metadata")
    .eq("status", "scheduled")
    .gte("created_at", `${date}T00:00:00`)
    .lt("created_at", `${date}T23:59:59`);

  // Also check by metadata booking_date
  const { data: bookedByMeta } = await supabase
    .from("consultations")
    .select("metadata")
    .eq("status", "scheduled")
    .filter("metadata->>booking_date", "eq", date);

  const bookedTimes = new Set<string>();
  const allBooked = [...(booked || []), ...(bookedByMeta || [])];
  for (const row of allBooked) {
    const meta = row.metadata as Record<string, unknown> | null;
    if (meta?.booking_time) bookedTimes.add(meta.booking_time as string);
  }

  const slots = ALL_SLOTS.filter((s) => !bookedTimes.has(s));
  return NextResponse.json({ slots, date });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visit_type, date, time, patient_name, patient_email, patient_phone, reason, doctor_id } = body;

    if (!visit_type || !date || !time || !patient_name || !patient_email || !patient_phone || !doctor_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Find or create patient
    const { data: existingPatients } = await supabase
      .from("patients")
      .select("id")
      .eq("name", patient_name)
      .filter("contact_info->>email", "eq", patient_email)
      .limit(1);

    let patientId: string;

    if (existingPatients && existingPatients.length > 0) {
      patientId = existingPatients[0].id;
    } else {
      // Create new patient
      const mrn = `PB-${Date.now().toString(36).toUpperCase()}`;
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert({
          name: patient_name,
          mrn,
          dob: null,
          gender: null,
          contact_info: {
            email: patient_email,
            phone: patient_phone,
          },
        })
        .select("id")
        .single();

      if (patientError || !newPatient) {
        return NextResponse.json({ error: "Failed to create patient record" }, { status: 500 });
      }
      patientId = newPatient.id;
    }

    // Create consultation
    const { data: consultation, error: consultError } = await supabase
      .from("consultations")
      .insert({
        patient_id: patientId,
        user_id: doctor_id,
        visit_type: visit_type === "in-person" ? "in-person" : "telemedicine",
        status: "scheduled",
        metadata: {
          booking_date: date,
          booking_time: time,
          reason: reason || "",
          patient_email: patient_email,
          patient_phone: patient_phone,
          booked_online: true,
        },
      })
      .select("id")
      .single();

    if (consultError || !consultation) {
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    return NextResponse.json({
      consultation_id: consultation.id,
      patient_id: patientId,
      status: "scheduled",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
