import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata = {
  title: "Dashboard - MindCare AI",
  description: "Welcome to your medical scribe dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  let user: { id: string; email?: string | null } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {}

  const demoUserId = user?.id || "00000000-0000-0000-0000-000000000000";

  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", demoUserId)
    .single();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    { count: todayCount },
    { count: pendingCount },
    { count: finalizedCount },
    { data: recentConsultations },
    { data: todaySchedule },
    { data: patientsAtRisk },
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", demoUserId)
      .gte("created_at", today.toISOString()),
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", demoUserId)
      .in("status", ["transcribed", "note_generated"]),
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", demoUserId)
      .eq("status", "finalized"),
    supabase
      .from("consultations")
      .select("id, patient_id, visit_type, status, created_at, metadata")
      .eq("user_id", demoUserId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("consultations")
      .select("id, patient_id, visit_type, status, created_at, metadata, recording_duration_seconds")
      .eq("user_id", demoUserId)
      .gte("created_at", today.toISOString())
      .lte("created_at", tomorrow.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("consultations")
      .select("id, patient_id, visit_type, status, metadata, created_at")
      .eq("user_id", demoUserId)
      .in("status", ["transcribed", "note_generated"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const consultationsWithPatients = (recentConsultations || []).map((c) => ({
    id: c.id,
    visit_type: c.visit_type,
    status: c.status,
    created_at: c.created_at,
    patientName: (c.metadata as Record<string, unknown>)?.patient_name as string || "Unnamed Patient",
  }));

  const todayItems = (todaySchedule || []).map((c) => ({
    id: c.id,
    visit_type: c.visit_type,
    status: c.status,
    created_at: c.created_at,
    patientName: (c.metadata as Record<string, unknown>)?.patient_name as string || "Unnamed Patient",
    patientCode: (c.metadata as Record<string, unknown>)?.patient_code as string || c.patient_id?.substring(0, 8) || "—",
    diagnosis: (c.metadata as Record<string, unknown>)?.diagnosis as string || "—",
    riskStatus: (c.metadata as Record<string, unknown>)?.risk_status as string || "normal",
  }));

  const atRiskItems = (patientsAtRisk || []).map((c) => ({
    id: c.id,
    visit_type: c.visit_type,
    status: c.status,
    patientName: (c.metadata as Record<string, unknown>)?.patient_name as string || "Unnamed Patient",
  }));

  const rawName = userProfile?.full_name || user?.email?.split("@")[0] || "Doctor";
  const displayName = rawName.replace(/^Dr\.?\s*/i, "");

  return (
    <DashboardContent
      displayName={displayName}
      todayCount={todayCount ?? 0}
      pendingCount={pendingCount ?? 0}
      finalizedCount={finalizedCount ?? 0}
      consultationsWithPatients={consultationsWithPatients}
      todayItems={todayItems}
      atRiskItems={atRiskItems}
    />
  );
}
