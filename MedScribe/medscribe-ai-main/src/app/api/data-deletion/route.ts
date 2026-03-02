import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getClientIp, supabaseAdmin } from "@/lib/audit";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);

    // Log the deletion action BEFORE deleting
    await logAudit({
      user_id: user.id,
      action: "data_deletion",
      resource_type: "all_user_data",
      resource_id: user.id,
      metadata: { reason: "user_requested_gdpr_deletion" },
      ip_address: ip,
    });

    // Cascade delete in order (respecting foreign keys)
    // 1. Clinical notes (via consultations)
    const { data: consultations } = await supabaseAdmin
      .from("consultations")
      .select("id")
      .eq("user_id", user.id);

    const consultationIds = (consultations || []).map((c) => c.id);

    if (consultationIds.length > 0) {
      await supabaseAdmin
        .from("clinical_notes")
        .delete()
        .in("consultation_id", consultationIds);

      await supabaseAdmin
        .from("transcripts")
        .delete()
        .in("consultation_id", consultationIds);
    }

    // 2. Consultations
    await supabaseAdmin.from("consultations").delete().eq("user_id", user.id);

    // 3. Patients
    await supabaseAdmin.from("patients").delete().eq("user_id", user.id);

    // 4. Note templates
    await supabaseAdmin.from("note_templates").delete().eq("user_id", user.id);

    // 5. Audit log (delete all except the deletion record we just created)
    await supabaseAdmin
      .from("audit_log")
      .delete()
      .eq("user_id", user.id)
      .neq("action", "data_deletion");

    // 6. User profile
    await supabaseAdmin.from("users").delete().eq("id", user.id);

    return NextResponse.json({ success: true, message: "All data deleted" });
  } catch (error) {
    console.error("Data deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete data" },
      { status: 500 }
    );
  }
}
