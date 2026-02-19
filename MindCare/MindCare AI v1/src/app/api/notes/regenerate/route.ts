import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/utils/demo-auth";
import type { NoteSection, BillingCode } from "@/types";

/**
 * POST /api/notes/regenerate
 * Regenerates an entire clinical note (all sections + billing codes) using Claude AI.
 * Respects the consultation language — outputs in the same language as the transcript.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    const { consultationId, noteId, transcript } = await request.json();

    if (!consultationId || !noteId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const { data: consultation } = await supabase
      .from("consultations")
      .select("user_id, visit_type, metadata")
      .eq("id", consultationId)
      .single();

    if (!consultation || consultation.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing note for template info
    const { data: existingNote } = await supabase
      .from("clinical_notes")
      .select("generation_metadata, sections")
      .eq("id", noteId)
      .single();

    const template = (existingNote?.generation_metadata as Record<string, unknown>)?.template as string || "SOAP Note";

    // Detect language from the transcript record
    const { data: transcriptRecord } = await supabase
      .from("transcripts")
      .select("language")
      .eq("consultation_id", consultationId)
      .single();

    const language = transcriptRecord?.language || "en";
    const isEnglish = language === "en" || language.startsWith("en-");

    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", ro: "Romanian", de: "German", fr: "French", es: "Spanish",
      it: "Italian", pt: "Portuguese", nl: "Dutch", pl: "Polish", hu: "Hungarian",
      bg: "Bulgarian", cs: "Czech", ru: "Russian", tr: "Turkish", hi: "Hindi",
      ja: "Japanese", ko: "Korean",
    };
    const outputLanguage = LANGUAGE_NAMES[language] || language;

    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (!mistralApiKey) {
      return NextResponse.json({ error: "Mistral API key not configured" }, { status: 500 });
    }

    const transcriptText = transcript?.full_text || transcript?.segments?.map(
      (s: { speaker: string; text: string }) => `[${s.speaker}]: ${s.text}`
    ).join("\n") || "";

    const sectionTitles = (existingNote?.sections as NoteSection[])?.map(
      (s: NoteSection) => s.title
    ) || [];

    const languageInstruction = isEnglish
      ? ""
      : `\nCRITICAL: The consultation was in ${outputLanguage}. ALL output (section titles, section content, billing code descriptions, rationales) MUST be written in ${outputLanguage}. Only the JSON keys remain in English.`;

    const { Mistral } = await import("@mistralai/mistralai");
    const mistralClient = new Mistral({ apiKey: mistralApiKey });

    let mistralResponse;
    try {
      mistralResponse = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: `You are a medical documentation AI. Regenerate a complete ${template} clinical note. Return valid JSON only with this structure:
{
  "sections": [{ "title": "...", "content": "...", "order": 0 }],
  "billing_codes": [{ "code": "...", "system": "ICD-10" or "CPT", "description": "...", "confidence": 0.0-1.0, "rationale": "...", "accepted": false }]
}
Use these section titles as reference: ${JSON.stringify(sectionTitles)}. Extract info ONLY from the transcript. Use [?] for unclear information.${languageInstruction}`,
          },
          {
            role: "user",
            content: `Regenerate the complete clinical note from this transcript:\n\n${transcriptText}${!isEnglish ? `\n\nIMPORTANT: Write ALL content in ${outputLanguage}.` : ""}\n\nRespond with JSON only.`,
          },
        ],
        maxTokens: 4096,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `AI generation failed: ${errMsg}` }, { status: 500 });
    }

    const responseText = typeof mistralResponse.choices?.[0]?.message?.content === 'string'
      ? mistralResponse.choices[0].message.content
      : "";

    let parsed: { sections: NoteSection[]; billing_codes: BillingCode[] };
    try {
      const cleanJson = responseText.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: NoteSection[] = (parsed.sections || []).map(
      (s: any, idx: number) => ({
        title: String(s.title || `Section ${idx + 1}`),
        content: String(s.content || ""),
        order: typeof s.order === "number" ? s.order : idx,
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billingCodes: BillingCode[] = (parsed.billing_codes || []).map(
      (c: any) => ({
        code: String(c.code || ""),
        system: c.system === "CPT" ? ("CPT" as const) : ("ICD-10" as const),
        description: String(c.description || ""),
        confidence: typeof c.confidence === "number" ? c.confidence : 0.5,
        rationale: c.rationale ? String(c.rationale) : undefined,
        accepted: false,
      })
    );

    return NextResponse.json({ sections, billingCodes });
  } catch (err) {
    console.error("[RegenerateNote] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to regenerate note" },
      { status: 500 }
    );
  }
}
