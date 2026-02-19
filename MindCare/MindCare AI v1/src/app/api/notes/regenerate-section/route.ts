import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/utils/demo-auth";

/**
 * POST /api/notes/regenerate-section
 * Regenerates a single section of a clinical note using Claude AI.
 * Respects the consultation language — outputs in the same language as the transcript.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    const { consultationId, noteId, sectionTitle, transcript } = await request.json();

    if (!consultationId || !noteId || !sectionTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const { data: consultation } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", consultationId)
      .single();

    if (!consultation || consultation.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const languageInstruction = isEnglish
      ? ""
      : ` The consultation was conducted in ${outputLanguage}. You MUST write the regenerated section content entirely in ${outputLanguage}, using medical terminology appropriate for ${outputLanguage}-speaking medical practice.`;

    const { Mistral } = await import("@mistralai/mistralai");
    const mistralClient = new Mistral({ apiKey: mistralApiKey });

    let mistralResponse;
    try {
      mistralResponse = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: `You are a medical documentation AI. Regenerate ONLY the "${sectionTitle}" section of a clinical note based on the transcript. Return ONLY the section content as plain text, no JSON, no markdown headers.${languageInstruction}`,
          },
          {
            role: "user",
            content: `Regenerate the "${sectionTitle}" section from this consultation transcript:\n\n${transcriptText}${!isEnglish ? `\n\nIMPORTANT: Write your response entirely in ${outputLanguage}.` : ""}`,
          },
        ],
        maxTokens: 1024,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `AI generation failed: ${errMsg}` }, { status: 500 });
    }

    const content = typeof mistralResponse.choices?.[0]?.message?.content === 'string'
      ? mistralResponse.choices[0].message.content
      : "";

    return NextResponse.json({ content });
  } catch (err) {
    console.error("[RegenerateSection] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to regenerate section" },
      { status: 500 }
    );
  }
}
