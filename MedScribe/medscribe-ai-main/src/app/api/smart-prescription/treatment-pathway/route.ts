import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/smart-prescription/treatment-pathway
 * Query: diagnosis (ICD-10 code) or diagnosis_name (partial match)
 * Returns Maudsley-style treatment pathway: line 1, line 2, line 3 options.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const diagnosis = searchParams.get("diagnosis")?.trim();
    const diagnosisName = searchParams.get("diagnosis_name")?.trim();

    if (!diagnosis && !diagnosisName) {
      return NextResponse.json(
        { error: "Query param required: diagnosis (ICD-10) or diagnosis_name" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("medication_protocols")
      .select(`
        id, diagnosis_icd10, diagnosis_name, line, list_type, compensated, source, notes,
        medications (id, name, atc_code, list_type, compensated)
      `)
      .order("line");

    if (diagnosis) query = query.eq("diagnosis_icd10", diagnosis);
    if (diagnosisName) query = query.ilike("diagnosis_name", `%${diagnosisName}%`);

    const { data: rows, error } = await query;

    if (error) {
      console.error("[smart-prescription/treatment-pathway]", error);
      return NextResponse.json({ error: "Failed to fetch pathway" }, { status: 500 });
    }

    type MedObj = { id: string; name: string; atc_code: string | null; list_type: string | null; compensated: boolean | null };
    type ProtocolRow = {
      diagnosis_icd10: string;
      diagnosis_name: string | null;
      line: number;
      list_type: string | null;
      compensated: boolean | null;
      source: string;
      notes: string | null;
      medications: MedObj | MedObj[] | null;
    };
    const protocols = (rows || []) as ProtocolRow[];

    const byLine: Record<number, ProtocolRow[]> = {};
    for (const p of protocols) {
      if (!byLine[p.line]) byLine[p.line] = [];
      byLine[p.line].push(p);
    }

    const normMed = (m: ProtocolRow["medications"]) =>
      Array.isArray(m) ? m[0] ?? null : m;

    const lines = [1, 2, 3, 4, 5]
      .filter((line) => byLine[line]?.length)
      .map((line) => ({
        line,
        label: line === 1 ? "First-line" : line === 2 ? "Second-line" : line === 3 ? "Third-line" : `Line ${line}`,
        options: byLine[line].map((p) => ({
          medication: normMed(p.medications),
          list_type: p.list_type,
          compensated: p.compensated,
          source: p.source,
          notes: p.notes,
        })),
      }));

    const firstDiagnosis = protocols[0];
    return NextResponse.json({
      diagnosis_icd10: firstDiagnosis?.diagnosis_icd10,
      diagnosis_name: firstDiagnosis?.diagnosis_name,
      pathway: lines,
      source: "Maudsley / CANMAT-style (validate with current guidelines)",
    });
  } catch (err) {
    console.error("[smart-prescription/treatment-pathway]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
