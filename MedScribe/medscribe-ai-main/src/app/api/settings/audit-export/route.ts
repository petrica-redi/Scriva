import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: profile,
    } = await supabase
      .from("users")
      .select("settings")
      .eq("id", user.id)
      .single();

    const settings = (profile?.settings || {}) as Record<string, unknown>;
    const includeTranscripts = Boolean(settings.audit_export_include_transcripts);

    const { data: auditLog } = await supabase
      .from("audit_log")
      .select("id, action, resource_type, resource_id, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);

    const { data: consultations } = await supabase
      .from("consultations")
      .select("id, patient_id, visit_type, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);

    const consultationIds = (consultations || []).map((c) => c.id);

    const { data: notes } = consultationIds.length
      ? await supabase
          .from("clinical_notes")
          .select("id, consultation_id, status, ai_model, created_at, updated_at")
          .in("consultation_id", consultationIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const { data: transcripts } = includeTranscripts && consultationIds.length
      ? await supabase
          .from("transcripts")
          .select("id, consultation_id, language, provider, created_at")
          .in("consultation_id", consultationIds)
      : { data: [] };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      includeTranscripts,
      data: {
        auditLog: auditLog || [],
        consultations: consultations || [],
        notes: notes || [],
        transcripts: transcripts || [],
      },
    });
  } catch (err) {
    console.error("[Audit Export] Error", err);
    return NextResponse.json(
      { error: "Failed to export audit data" },
      { status: 500 }
    );
  }
}
