import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/smart-prescription/medications
 * Query: q (search), diagnosis (ICD-10), diagnosis_name, region
 * Returns medications list; if diagnosis provided, includes protocol info (line, list_type, compensated).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();
    const diagnosis = searchParams.get("diagnosis")?.trim();
    const diagnosisName = searchParams.get("diagnosis_name")?.trim();
    const region = searchParams.get("region") || "global";

    let query = supabase
      .from("medications")
      .select("id, name, brand_names, atc_code, list_type, compensated, source, region");

    if (region) query = query.eq("region", region);
    if (q) query = query.ilike("name", `%${q}%`);

    const { data: medications, error: medError } = await query.order("name");

    if (medError) {
      console.error("[smart-prescription/medications]", medError);
      return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
    }

    let protocols: Array<Record<string, unknown>> = [];
    if ((diagnosis || diagnosisName) && medications && medications.length > 0) {
      let protoQuery = supabase
        .from("medication_protocols")
        .select(`
          id, diagnosis_icd10, diagnosis_name, line, list_type, compensated, source, notes,
          medications (id, name, atc_code, list_type, compensated)
        `);
      if (diagnosis) protoQuery = protoQuery.eq("diagnosis_icd10", diagnosis);
      if (diagnosisName) protoQuery = protoQuery.ilike("diagnosis_name", `%${diagnosisName}%`);
      const { data: protoRows } = await protoQuery.order("line");
      protocols = (protoRows || []) as Array<Record<string, unknown>>;
    }

    return NextResponse.json({
      medications: medications || [],
      protocols: protocols.length > 0 ? protocols : undefined,
    });
  } catch (err) {
    console.error("[smart-prescription/medications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
