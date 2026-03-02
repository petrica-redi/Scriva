import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NoteSection, BillingCode } from "@/types";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { z } from "zod";

const regenerateNoteSchema = z.object({
  consultationId: z.string().uuid("Invalid consultation ID"),
  noteId: z.string().uuid("Invalid note ID"),
  transcript: z.object({
    full_text: z.string().max(500_000).optional(),
    segments: z.array(z.object({
      speaker: z.string(),
      text: z.string(),
    })).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "regenerate_note");
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterSec: limitResult.retryAfterSec,
          remaining: limitResult.remaining,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = regenerateNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { consultationId, noteId, transcript } = validation.data;

    const { data: consultation } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", consultationId)
      .single();

    if (!consultation || consultation.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existingNote } = await supabase
      .from("clinical_notes")
      .select("generation_metadata, sections")
      .eq("id", noteId)
      .single();

    const template =
      ((existingNote?.generation_metadata as Record<string, unknown>)?.template as string) ||
      "SOAP Note";

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

    const rawTranscriptText =
      transcript?.full_text ||
      transcript?.segments
        ?.map((s: { speaker: string; text: string }) => `[${s.speaker}]: ${s.text}`)
        .join("\n") ||
      "";

    // Pseudonymize transcript before sending to external AI
    const { pseudonymizedText: transcriptText, mappings: piiMappings } =
      pseudonymize(rawTranscriptText);

    const sectionTitles =
      (existingNote?.sections as NoteSection[] | null)?.map((s: NoteSection) => s.title) || [];

    const languageInstruction = isEnglish
      ? ""
      : `\nCRITICAL: The consultation was in ${outputLanguage}. ALL output (section titles, section content, billing code descriptions, rationales) MUST be written in ${outputLanguage}. Only the JSON keys remain in English.`;

    const aiResult = await generateWithFallback({
      systemPrompt: `You are a medical documentation AI. Regenerate a complete ${template} clinical note. Return valid JSON only with this structure:\n{\n  "sections": [{ "title": "...", "content": "...", "order": 0 }],\n  "billing_codes": [{ "code": "...", "system": "ICD-10" or "CPT", "description": "...", "confidence": 0.0-1.0, "rationale": "...", "accepted": false }]\n}\nUse these section titles as reference: ${JSON.stringify(sectionTitles)}. Extract info ONLY from the transcript. Use [?] for unclear information.${languageInstruction}`,
      userPrompt: `Regenerate the complete clinical note from this transcript:\n\n${transcriptText}${!isEnglish ? `\n\nIMPORTANT: Write ALL content in ${outputLanguage}.` : ""}\n\nRespond with JSON only.`,
      maxTokens: 4096,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let parsed: { sections: NoteSection[]; billing_codes: BillingCode[] };
    try {
      const cleanJson = aiResult.text
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // De-pseudonymize: restore real PII in AI-generated content
    const sections: NoteSection[] = (parsed.sections || []).map((s, idx) => ({
      title: dePseudonymize(String(s.title || `Section ${idx + 1}`), piiMappings),
      content: dePseudonymize(String(s.content || ""), piiMappings),
      order: typeof s.order === "number" ? s.order : idx,
    }));

    const billingCodes: BillingCode[] = (parsed.billing_codes || []).map((c) => ({
      code: String(c.code || ""),
      system: c.system === "CPT" ? ("CPT" as const) : ("ICD-10" as const),
      description: dePseudonymize(String(c.description || ""), piiMappings),
      confidence: typeof c.confidence === "number" ? c.confidence : 0.5,
      rationale: c.rationale ? dePseudonymize(String(c.rationale), piiMappings) : undefined,
      accepted: false,
    }));

    await logAuditEvent(
      supabase,
      user.id,
      "ai_regenerate_note",
      "consultation",
      consultationId,
      {
        provider: aiResult.provider,
        model: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      }
    );

    return NextResponse.json({
      sections,
      billingCodes,
      provider: aiResult.provider,
      model: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
      rateLimit: {
        remaining: limitResult.remaining,
        retryAfterSec: limitResult.retryAfterSec,
      },
    });
  } catch (err) {
    console.error("[RegenerateNote] Error:", err);
    return NextResponse.json(
      { error: "Failed to regenerate note" },
      { status: 500 }
    );
  }
}
