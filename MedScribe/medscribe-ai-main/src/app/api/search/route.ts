import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeSearchInput(input: string): string {
  return input.replace(/[%_\\(),.'":;]/g, "");
}

/**
 * GET /api/search?q=query&type=all|consultations|notes|patients
 * Searches across consultations, clinical notes, transcripts, and patients.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q")?.trim();
    const type = searchParams.get("type") || "all";

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json({ consultations: [], notes: [], patients: [] });
    }

    if (rawQuery.length > 200) {
      return NextResponse.json({ error: "Search query too long" }, { status: 400 });
    }

    const query = sanitizeSearchInput(rawQuery);
    if (query.length < 2) {
      return NextResponse.json({ consultations: [], notes: [], patients: [] });
    }

    const pattern = `%${query}%`;
    const results: Record<string, unknown[]> = { consultations: [], notes: [], patients: [] };

    if (type === "all" || type === "consultations") {
      const { data: consultations } = await supabase
        .from("consultations")
        .select("id, visit_type, status, created_at, metadata")
        .eq("user_id", user.id)
        .or(`visit_type.ilike.${pattern},metadata->>patient_name.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(10);

      results.consultations = (consultations || []).map((c) => ({
        ...c,
        patient_name: (c.metadata as Record<string, unknown>)?.patient_name || "Unnamed Patient",
      }));
    }

    if (type === "all" || type === "notes") {
      const { data: transcripts } = await supabase
        .from("transcripts")
        .select("consultation_id, full_text")
        .textSearch("full_text", query, { type: "websearch" })
        .limit(10);

      if (transcripts && transcripts.length > 0) {
        const consultationIds = transcripts.map((t) => t.consultation_id);
        const { data: noteConsultations } = await supabase
          .from("consultations")
          .select("id, visit_type, status, created_at, metadata")
          .eq("user_id", user.id)
          .in("id", consultationIds);

        results.notes = (noteConsultations || []).map((c) => ({
          ...c,
          patient_name: (c.metadata as Record<string, unknown>)?.patient_name || "Unnamed Patient",
          match_source: "transcript",
        }));
      }
    }

    if (type === "all" || type === "patients") {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name, mrn, date_of_birth, gender, created_at")
        .eq("user_id", user.id)
        .or(`full_name.ilike.${pattern},mrn.ilike.${pattern}`)
        .order("full_name")
        .limit(10);

      results.patients = patients || [];
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
