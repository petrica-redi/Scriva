import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { z } from "zod";

const regenerateSectionSchema = z.object({
  consultationId: z.string().uuid("Invalid consultation ID"),
  noteId: z.string().uuid("Invalid note ID"),
  sectionTitle: z.string().min(1).max(200),
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

    const limitResult = enforceAIRateLimit(user.id, "regenerate_section");
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
    const validation = regenerateSectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { consultationId, noteId, sectionTitle, transcript } = validation.data;

    const { data: consultation } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", consultationId)
      .single();

    if (!consultation || consultation.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const languageInstruction = isEnglish
      ? ""
      : ` The consultation was conducted in ${outputLanguage}. You MUST write the regenerated section content entirely in ${outputLanguage}, using medical terminology appropriate for ${outputLanguage}-speaking medical practice.`;

    const aiResult = await generateWithFallback({
      systemPrompt: `You are a medical documentation AI. Regenerate ONLY the "${sectionTitle}" section of a clinical note based on the transcript. Return ONLY the section content as plain text, no JSON, no markdown headers.${languageInstruction}`,
      userPrompt: `Regenerate the "${sectionTitle}" section from this consultation transcript:\n\n${transcriptText}${!isEnglish ? `\n\nIMPORTANT: Write your response entirely in ${outputLanguage}.` : ""}`,
      maxTokens: 1024,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    await logAuditEvent(
      supabase,
      user.id,
      "ai_regenerate_section",
      "consultation",
      consultationId,
      {
        sectionTitle,
        provider: aiResult.provider,
        model: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      }
    );

    return NextResponse.json({
      content: dePseudonymize(aiResult.text, piiMappings),
      provider: aiResult.provider,
      model: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
      rateLimit: {
        remaining: limitResult.remaining,
        retryAfterSec: limitResult.retryAfterSec,
      },
    });
  } catch (err) {
    console.error("[RegenerateSection] Error:", err);
    return NextResponse.json(
      { error: "Failed to regenerate section" },
      { status: 500 }
    );
  }
}
