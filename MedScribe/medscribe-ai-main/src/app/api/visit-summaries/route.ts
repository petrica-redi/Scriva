import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patient_id");
    if (!patientId) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("visit_summaries")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Visit summaries GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { consultation_id, patient_id, clinical_note_sections } = await request.json();

    if (!consultation_id || !patient_id) {
      return NextResponse.json({ error: "consultation_id and patient_id are required" }, { status: 400 });
    }

    // Generate patient-friendly summary from clinical note
    let summary_text = "";
    let medications: Array<{ name: string; dosage: string; frequency: string; instructions: string }> = [];
    let instructions = "";
    let follow_up_date: string | null = null;

    if (clinical_note_sections && Array.isArray(clinical_note_sections)) {
      const noteText = clinical_note_sections
        .map((s: { title: string; content: string }) => `${s.title}: ${s.content}`)
        .join("\n\n");

      const { pseudonymizedText, mappings } = pseudonymize(noteText);

      try {
        const aiResult = await generateWithFallback({
          systemPrompt: `Convert this clinical note into a patient-friendly visit summary. Use simple, non-medical language. The patient should understand what was discussed, what their diagnosis means, what medications they need to take, and when to follow up.

Return JSON:
{
  "summary": "Plain language summary of the visit",
  "medications": [{"name": "...", "dosage": "...", "frequency": "...", "instructions": "..."}],
  "instructions": "What the patient should do at home",
  "follow_up_date": "YYYY-MM-DD or null",
  "warning_signs": "When to seek immediate medical attention"
}`,
          userPrompt: pseudonymizedText,
          maxTokens: 1500,
          temperature: 0.2,
        });

        const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary_text = dePseudonymize(parsed.summary || "", mappings);
          medications = parsed.medications || [];
          instructions = dePseudonymize(
            [parsed.instructions || "", parsed.warning_signs ? `\n\nWarning signs: ${parsed.warning_signs}` : ""].join(""),
            mappings
          );
          follow_up_date = parsed.follow_up_date || null;
        }
      } catch {
        summary_text = "Visit summary could not be auto-generated. Please ask your doctor for details.";
      }
    }

    const { data, error } = await supabase
      .from("visit_summaries")
      .insert({
        consultation_id,
        patient_id,
        summary_text: summary_text || "Summary pending",
        medications,
        instructions,
        follow_up_date,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create summary" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Visit summaries POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
