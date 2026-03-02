import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import type { StatConsultation } from "@/components/dashboard/DashboardStats";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { PriorityQueue } from "@/components/dashboard/PriorityQueue";
import type { FollowUpItem } from "@/components/dashboard/PriorityQueue";
import { PatientsAtRisk } from "@/components/dashboard/PatientsAtRisk";
import type { RiskPatient } from "@/components/dashboard/PatientsAtRisk";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { RecentConsultations } from "@/components/dashboard/RecentConsultations";

export const metadata = {
  title: "Dashboard - MedScribe AI",
  description: "Clinical operations dashboard",
};

// Greeting logic moved to DashboardGreeting client component for i18n support

function safeString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const consultFields = "id, patient_id, visit_type, status, created_at, metadata";

  const [
    { count: todayCount },
    { count: pendingCount },
    { count: finalizedCount },
    { data: recentConsultations },
    { data: todaySchedule },
    { data: patientsAtRisk },
    { data: pendingList },
    { data: finalizedList },
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString()),
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["transcribed", "note_generated"]),
    supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "finalized"),
    supabase
      .from("consultations")
      .select(consultFields)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("consultations")
      .select(consultFields)
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .lte("created_at", dayAfterTomorrow.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("consultations")
      .select(consultFields)
      .eq("user_id", user.id)
      .in("status", ["transcribed", "note_generated"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("consultations")
      .select(consultFields)
      .eq("user_id", user.id)
      .in("status", ["transcribed", "note_generated"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("consultations")
      .select(consultFields)
      .eq("user_id", user.id)
      .eq("status", "finalized")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  function toStatConsultation(c: Record<string, unknown>): StatConsultation {
    const meta = ((c.metadata || {}) as Record<string, unknown>);
    return {
      id: c.id as string,
      patient_id: (c.patient_id as string) ?? null,
      visit_type: (c.visit_type as string) ?? "General Visit",
      status: c.status as string,
      created_at: c.created_at as string,
      patientName: safeString(meta.patient_name, "Unnamed Patient"),
      diagnosis: safeString(meta.diagnosis),
    };
  }

  const consultationsWithPatients = (recentConsultations || []).map((c) => {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    return {
      ...c,
      patientName: safeString(meta.patient_name, "Unnamed Patient"),
    };
  });

  const todayItems = (todaySchedule || []).map((c) => {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    return {
      ...c,
      patientName: safeString(meta.patient_name, "Unnamed Patient"),
      patientCode: safeString(meta.patient_code, c.patient_id?.substring(0, 8) || "—"),
      diagnosis: safeString(meta.primary_diagnosis, safeString(meta.diagnosis, "Undocumented")),
      riskStatus:
        typeof meta.risk_status === "string" ? meta.risk_status : "normal",
    };
  });

  const atRiskItems = (patientsAtRisk || []).map((c) => {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    return {
      ...c,
      patientName: safeString(meta.patient_name, "Unnamed Patient"),
    };
  });

  const todayStatItems = (todaySchedule || []).map(toStatConsultation);
  const pendingStatItems = (pendingList || []).map(toStatConsultation);
  const finalizedStatItems = (finalizedList || []).map(toStatConsultation);
  const attentionStatItems = (patientsAtRisk || []).map(toStatConsultation);

  // Build Patients at Risk from consultations with risk metadata
  const allConsultationsForRisk = [
    ...(recentConsultations || []),
    ...(pendingList || []),
    ...(finalizedList || []),
  ];
  
  // Deduplicate by patient_id and build risk profiles
  const riskMap = new Map<string, RiskPatient>();
  for (const c of allConsultationsForRisk) {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    const patientId = c.patient_id as string;
    if (!patientId || riskMap.has(patientId)) continue;
    
    const riskLevel = meta.risk_level as string | undefined;
    const riskSignals = meta.risk_signals as { label: string; severity: "critical" | "high" | "medium" | "low" }[] | undefined;
    
    if (riskLevel && (riskLevel === "high" || riskLevel === "medium") && riskSignals) {
      riskMap.set(patientId, {
        id: patientId,
        patientName: safeString(meta.patient_name, "Unknown"),
        mrn: safeString(meta.patient_code, "—"),
        diagnosis: safeString(meta.primary_diagnosis, "—"),
        icd10: safeString(meta.diagnosis_code, "—"),
        riskLevel: riskLevel as "high" | "medium",
        riskSignals,
      });
    }
  }
  const riskPatients = Array.from(riskMap.values()).sort((a, b) => 
    a.riskLevel === "high" && b.riskLevel !== "high" ? -1 : 
    a.riskLevel !== "high" && b.riskLevel === "high" ? 1 : 0
  );

  // Build unified Priority Follow-up Queue
  const followUpItems: FollowUpItem[] = [];

  // Add review items (transcribed/note_generated consultations)
  for (const c of atRiskItems) {
    followUpItems.push({
      id: `review-${c.id}`,
      type: c.status === "transcribed" ? "review" : "note",
      patientName: c.patientName,
      severity: "high",
      title: c.status === "transcribed" ? "Transcript review required" : "Generated note needs approval",
      detail: `${c.visit_type} consultation — ${c.status === "transcribed" ? "Review and generate clinical note" : "Review AI-generated note for accuracy"}`,
      actionLabel: "Open Case",
      actionHref: c.patient_id ? `/patients/${c.patient_id}` : `/consultation/${c.id}/note`,
    });
  }

  // Add prescription items from metadata
  const seenRxPatients = new Set<string>();
  for (const c of allConsultationsForRisk) {
    const meta = (c.metadata || {}) as Record<string, unknown>;
    const patientId = c.patient_id as string;
    if (!patientId || seenRxPatients.has(patientId)) continue;

    const rxAlerts = meta.pending_prescriptions as { id: string; patientName: string; medication: string; dosage: string; expiresIn: number; status: string }[] | undefined;
    if (rxAlerts) {
      seenRxPatients.add(patientId);
      for (const rx of rxAlerts) {
        if (rx.status === "overdue" || rx.status === "urgent") {
          followUpItems.push({
            id: `rx-${rx.id}`,
            type: "prescription",
            patientName: rx.patientName,
            severity: rx.status === "overdue" ? "critical" : "high",
            title: `${rx.medication} ${rx.dosage}`,
            detail: rx.expiresIn < 0
              ? `Prescription ${Math.abs(rx.expiresIn)} days overdue — renew immediately`
              : `Expires in ${rx.expiresIn} days — schedule renewal`,
          });
        }
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  followUpItems.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
  const displayFollowUp = followUpItems.slice(0, 7);

  const displayName = userProfile?.full_name || user.email?.split("@")[0] || "Clinician";

  return (
    <div className="flex flex-col gap-6 pt-2">
      <DashboardGreeting displayName={displayName} />

      <DashboardStats
        todayCount={todayCount ?? 0}
        pendingCount={pendingCount ?? 0}
        finalizedCount={finalizedCount ?? 0}
        attentionCount={attentionStatItems.length}
        todayConsultations={todayStatItems}
        pendingConsultations={pendingStatItems}
        finalizedConsultations={finalizedStatItems}
        attentionConsultations={attentionStatItems}
      />

      <TodaySchedule items={todayItems} />

      <PatientsAtRisk patients={riskPatients} />

      <PriorityQueue items={displayFollowUp} />
    </div>
  );
}
