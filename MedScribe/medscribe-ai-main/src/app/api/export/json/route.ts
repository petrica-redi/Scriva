import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getClientIp } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all user data
    const [
      { data: profile },
      { data: patients },
      { data: consultations },
      { data: templates },
    ] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("patients").select("*").eq("user_id", user.id),
      supabase.from("consultations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("note_templates").select("*").eq("user_id", user.id),
    ]);

    const consultationIds = (consultations || []).map((c) => c.id);

    let transcripts: unknown[] = [];
    let clinicalNotes: unknown[] = [];

    if (consultationIds.length > 0) {
      const [{ data: t }, { data: n }] = await Promise.all([
        supabase.from("transcripts").select("*").in("consultation_id", consultationIds),
        supabase.from("clinical_notes").select("*").in("consultation_id", consultationIds),
      ]);
      transcripts = t || [];
      clinicalNotes = n || [];
    }

    const { data: auditLog } = await supabase
      .from("audit_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile,
      patients: patients || [],
      consultations: consultations || [],
      transcripts,
      clinical_notes: clinicalNotes,
      note_templates: templates || [],
      audit_log: auditLog || [],
    };

    await logAudit({
      user_id: user.id,
      action: "data_export_json",
      resource_type: "all_user_data",
      resource_id: user.id,
      metadata: {
        patients_count: (patients || []).length,
        consultations_count: (consultations || []).length,
      },
      ip_address: getClientIp(request),
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="medscribe-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("JSON export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
