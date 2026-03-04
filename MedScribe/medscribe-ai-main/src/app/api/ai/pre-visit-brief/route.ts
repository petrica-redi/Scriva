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

    const [
      { data: patient },
      { data: consultations },
      { data: followUps },
      { data: vitals },
      { data: alerts },
    ] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).eq("user_id", user.id).single(),
      supabase.from("consultations").select("id, visit_type, status, metadata, created_at")
        .eq("patient_id", patientId).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("follow_ups").select("*")
        .eq("patient_id", patientId).eq("user_id", user.id)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true }).limit(10),
      supabase.from("vital_readings").select("*")
        .eq("patient_id", patientId).eq("user_id", user.id)
        .order("recorded_at", { ascending: false }).limit(20),
      supabase.from("clinical_alerts").select("*")
        .eq("patient_id", patientId).eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false }).limit(5),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const age = patient.date_of_birth
      ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const lastConsultation = consultations?.[0] || null;
    const lastMeta = (lastConsultation?.metadata || {}) as Record<string, unknown>;

    const activeMeds: Array<{ name: string; dosage: string; since: string }> = [];
    for (const c of consultations || []) {
      const meta = (c.metadata || {}) as Record<string, unknown>;
      const meds = meta.medications as Array<{ name: string; dosage: string }> | undefined;
      if (meds) {
        for (const med of meds) {
          if (!activeMeds.find((m) => m.name === med.name)) {
            activeMeds.push({ name: med.name, dosage: med.dosage, since: c.created_at });
          }
        }
      }
    }

    const riskFactors: string[] = [];
    for (const c of consultations || []) {
      const meta = (c.metadata || {}) as Record<string, unknown>;
      const risks = meta.risk_factors as string[] | undefined;
      if (risks) {
        for (const r of risks) {
          if (!riskFactors.includes(r)) riskFactors.push(r);
        }
      }
    }

    const recentVitals = (vitals || []).map((v) => ({
      type: v.reading_type as string,
      value: v.value as number,
      unit: v.unit as string,
      date: v.recorded_at as string,
      abnormal: v.is_abnormal as boolean,
    }));

    const brief = {
      patient: {
        name: patient.full_name,
        age,
        gender: patient.gender,
        mrn: patient.mrn,
      },
      lastVisit: lastConsultation ? {
        date: lastConsultation.created_at,
        visit_type: lastConsultation.visit_type,
        summary: (lastMeta.summary as string) || (lastMeta.notes as string) || "No summary available",
      } : null,
      activeMedications: activeMeds,
      pendingFollowUps: (followUps || []).map((f) => ({
        title: (f as Record<string, unknown>).title as string,
        due_date: (f as Record<string, unknown>).due_date as string,
        type: (f as Record<string, unknown>).type as string,
      })),
      recentVitals: recentVitals.slice(0, 10),
      riskFactors,
      overdueScreenings: [],
      recentAlerts: alerts || [],
    };

    return NextResponse.json(brief);
  } catch (err) {
    console.error("Pre-visit brief error:", err);
    return NextResponse.json({ error: "Failed to generate pre-visit brief" }, { status: 500 });
  }
}
