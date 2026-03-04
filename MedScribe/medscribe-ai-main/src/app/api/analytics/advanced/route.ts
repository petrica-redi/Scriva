import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = parseInt(request.nextUrl.searchParams.get("days") || "90", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      { data: allConsultations },
      { data: allNotes },
      { data: allFollowUps },
      { data: allPatients },
    ] = await Promise.all([
      supabase.from("consultations")
        .select("id, patient_id, visit_type, status, recording_duration_seconds, metadata, created_at")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("clinical_notes")
        .select("id, consultation_id, billing_codes, status, ai_model, generation_metadata, created_at")
        .gte("created_at", since.toISOString()),
      supabase.from("follow_ups")
        .select("id, patient_id, type, status, due_date, completed_at, auto_generated")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString()),
      supabase.from("patients")
        .select("id, created_at")
        .eq("user_id", user.id),
    ]);

    const consultations = allConsultations || [];
    const notes = allNotes || [];
    const followUps = allFollowUps || [];
    const patients = allPatients || [];

    // Time Saved Estimate (avg 15 min saved per AI-generated note)
    const aiGeneratedNotes = notes.filter((n) => n.ai_model);
    const timeSavedMinutes = aiGeneratedNotes.length * 15;

    // Diagnosis Trends
    const diagnosisCounts: Record<string, { code: string; description: string; count: number }> = {};
    for (const note of notes) {
      const codes = (note.billing_codes as Array<{ code: string; description: string; system: string }>) || [];
      for (const code of codes) {
        if (code.system === "ICD-10") {
          if (!diagnosisCounts[code.code]) {
            diagnosisCounts[code.code] = { code: code.code, description: code.description, count: 0 };
          }
          diagnosisCounts[code.code].count++;
        }
      }
    }
    const diagnosisTrends = Object.values(diagnosisCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Patient Retention
    const patientVisitCounts: Record<string, number> = {};
    for (const c of consultations) {
      if (c.patient_id) {
        patientVisitCounts[c.patient_id] = (patientVisitCounts[c.patient_id] || 0) + 1;
      }
    }
    const retention = {
      oneVisit: Object.values(patientVisitCounts).filter((v) => v === 1).length,
      twoToFour: Object.values(patientVisitCounts).filter((v) => v >= 2 && v <= 4).length,
      fivePlus: Object.values(patientVisitCounts).filter((v) => v >= 5).length,
    };

    // New vs Returning this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const newThisMonth = patients.filter((p) => new Date(p.created_at) >= thisMonth).length;
    const returningThisMonth = Object.keys(patientVisitCounts).filter((pid) => {
      const patient = patients.find((p) => p.id === pid);
      return patient && new Date(patient.created_at) < thisMonth;
    }).length;

    // Documentation efficiency
    const avgRecordingDuration = consultations
      .filter((c) => c.recording_duration_seconds)
      .reduce((sum, c) => sum + (c.recording_duration_seconds || 0), 0) / (consultations.filter((c) => c.recording_duration_seconds).length || 1);

    // Follow-up compliance
    const completedFollowUps = followUps.filter((f) => f.status === "completed").length;
    const totalFollowUps = followUps.length;
    const followUpCompliance = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

    // Weekly consultation volume
    const weeklyVolume: Record<string, number> = {};
    for (const c of consultations) {
      const week = new Date(c.created_at);
      week.setDate(week.getDate() - week.getDay());
      const weekKey = week.toISOString().split("T")[0];
      weeklyVolume[weekKey] = (weeklyVolume[weekKey] || 0) + 1;
    }

    // Visit type distribution
    const visitTypes: Record<string, number> = {};
    for (const c of consultations) {
      visitTypes[c.visit_type] = (visitTypes[c.visit_type] || 0) + 1;
    }

    // Referral tracking
    const referralCount = consultations.filter((c) => {
      const meta = (c.metadata || {}) as Record<string, unknown>;
      return meta.referral_sent === true;
    }).length;

    return NextResponse.json({
      summary: {
        total_consultations: consultations.length,
        total_patients: patients.length,
        ai_generated_notes: aiGeneratedNotes.length,
        time_saved_minutes: timeSavedMinutes,
        time_saved_hours: Math.round(timeSavedMinutes / 60 * 10) / 10,
        avg_recording_seconds: Math.round(avgRecordingDuration),
        follow_up_compliance: followUpCompliance,
        referrals_sent: referralCount,
      },
      diagnosis_trends: diagnosisTrends,
      patient_retention: retention,
      new_vs_returning: { new: newThisMonth, returning: returningThisMonth },
      weekly_volume: Object.entries(weeklyVolume)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count })),
      visit_type_distribution: Object.entries(visitTypes)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => ({ type, count })),
      follow_up_stats: {
        total: totalFollowUps,
        completed: completedFollowUps,
        pending: followUps.filter((f) => f.status === "pending").length,
        overdue: followUps.filter((f) => f.status === "overdue").length,
      },
    });
  } catch (err) {
    console.error("Advanced analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
