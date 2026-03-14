import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/audit";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/admin/overview
 * Platform-wide statistics for the admin panel overview tab.
 * Uses the service-role client to bypass RLS and see all rows.
 * Admin-only: caller must have role = 'admin'.
 */
export async function GET(request: Request) {
  try {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const [
      { count: totalConsultations },
      { count: totalTranscripts },
      { count: totalNotes },
      { count: totalPrescriptions },
      { count: totalPatients },
      { count: totalAuditEntries },
      { data: consultationData },
      { data: noteData },
    ] = await Promise.all([
      supabaseAdmin.from("consultations").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("transcripts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("clinical_notes").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("consultation_documents")
        .select("*", { count: "exact", head: true })
        .eq("document_type", "prescription"),
      supabaseAdmin.from("patients").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("audit_log").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("consultations").select("status"),
      supabaseAdmin.from("clinical_notes").select("status"),
    ]);

    const statusBreakdown: Record<string, number> = {};
    (consultationData ?? []).forEach((c: { status: string }) => {
      statusBreakdown[c.status] = (statusBreakdown[c.status] ?? 0) + 1;
    });

    const noteStatusBreakdown: Record<string, number> = {};
    (noteData ?? []).forEach((n: { status: string }) => {
      noteStatusBreakdown[n.status] = (noteStatusBreakdown[n.status] ?? 0) + 1;
    });

    return NextResponse.json({
      totalConsultations: totalConsultations ?? 0,
      totalTranscripts: totalTranscripts ?? 0,
      totalNotes: totalNotes ?? 0,
      totalPrescriptions: totalPrescriptions ?? 0,
      totalPatients: totalPatients ?? 0,
      totalAuditEntries: totalAuditEntries ?? 0,
      statusBreakdown,
      noteStatusBreakdown,
    });
  } catch (err) {
    console.error("[Admin overview] Error:", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
