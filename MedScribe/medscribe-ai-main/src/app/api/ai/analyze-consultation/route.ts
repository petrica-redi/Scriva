import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import type { PatientInfo } from "@/lib/pseudonymize";
import { getCountryGuidelinesPromptBlock } from "@/lib/guidelines-by-country";
import { getDiagnosticCriteriaPromptBlock } from "@/lib/diagnostic-criteria";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "analyze");
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

    const { data: profile } = await supabase
      .from("users")
      .select("practice_country")
      .eq("id", user.id)
      .single();
    const countryGuidelinesBlock = getCountryGuidelinesPromptBlock(profile?.practice_country ?? undefined);

    const { transcript, visitType, patientName } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    // Pseudonymize transcript before sending to external AI
    const patientInfo: PatientInfo = { name: patientName || undefined };
    const { pseudonymizedText: pseudonymizedTranscript, mappings: piiMappings } =
      pseudonymize(transcript, patientInfo);

    const systemPrompt = `You are an expert clinical decision support AI assisting a doctor during a live consultation. Analyze the doctor-patient conversation transcript and provide actionable clinical intelligence.

DIAGNOSIS RULES (critical):
- Base diagnoses on ICD-10 (and DSM where relevant) classification criteria only. Do NOT use treatment protocols or therapeutic guidelines as the source for diagnosis.
- For each diagnosis, explicitly consider TIME criteria (e.g. GAD requires ≥6 months; major depression ≥2 weeks; acute psychotic episode vs schizophrenia by duration). State in reasoning if a required duration is not documented in the transcript.
- For each diagnosis, consider SEVERITY and NUMBER of required symptoms (e.g. for GAD: required number of physical and psychological manifestations). State in reasoning if criteria are not yet met or not documented.
- In "reasoning", briefly state which criteria appear met and which are missing or unclear (e.g. "6-month duration criterion not documented", "need to clarify number of somatic symptoms").
- If information is insufficient to meet formal criteria, say so in reasoning and lower confidence; do not guess.

You MUST respond with valid JSON only (no markdown, no code blocks). Use this exact structure:

{
  "diagnoses": [
    {
      "name": "Diagnosis name",
      "icd10": "ICD-10 code if known",
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief clinical reasoning: which ICD/DSM criteria appear met or unmet (e.g. time, severity). Note if duration or severity criteria are not documented."
    }
  ],
  "followUpQuestions": [
    {
      "question": "The specific question to ask",
      "category": "history" | "symptoms" | "medications" | "lifestyle" | "family" | "review_of_systems" | "red_flags",
      "priority": "high" | "medium" | "low",
      "reasoning": "Why this question is important (1 sentence)"
    }
  ],
  "keyFindings": [
    {
      "finding": "Clinical finding description",
      "significance": "high" | "medium" | "low",
      "source": "subjective" | "objective"
    }
  ],
  "redFlags": [
    {
      "flag": "Description of the red flag or urgent item",
      "action": "Recommended immediate action"
    }
  ],
  "medications": [
    {
      "name": "Medication name (generic)",
      "brandNames": ["Brand name(s) if known"],
      "dosage": "Dosage mentioned or null",
      "purpose": "Why the patient takes it (from context)",
      "source": "current" | "prescribed" | "mentioned"
    }
  ],
  "drugInteractions": [
    {
      "drug1": "First medication name",
      "drug2": "Second medication name",
      "severity": "major" | "moderate" | "minor",
      "description": "Clear description of the interaction and its clinical effect",
      "mechanism": "Pharmacological mechanism (1 sentence)",
      "recommendation": "Specific recommendation for the doctor (e.g. monitor, adjust dose, avoid combination)"
    }
  ],
  "differentialNotes": "Brief narrative (2-3 sentences) about the differential diagnosis thought process, including which criteria are met or still need clarification (duration, severity, somatic symptoms)."
}

Rules:
- Base ALL analysis strictly on information in the transcript. Never invent symptoms or findings.
- Order diagnoses by confidence (highest first). Include 3-6 potential diagnoses.
- Suggest 5-8 follow-up questions the doctor hasn't asked yet. Always include questions to clarify: (1) DURATION of symptoms (e.g. "How long have these symptoms been present?"), (2) SEVERITY and frequency, (3) SOMATIZATION / physical symptoms (pain, paresthesia, tension, sleep, appetite) where relevant. Prioritize by clinical importance.
- Red flags should only appear if there are genuinely concerning symptoms or presentations.
- If information is insufficient, say so in differentialNotes and in diagnosis reasoning rather than guessing.
- Be specific and actionable.

MEDICATION & DRUG INTERACTION RULES:
- Extract ALL medications mentioned in the transcript.
- Analyze clinically significant interactions.
- If NO medications are mentioned, return empty arrays for medications and drugInteractions.${getDiagnosticCriteriaPromptBlock()}${countryGuidelinesBlock}`;

    const userPrompt = `Analyze this live consultation transcript and provide clinical decision support.

Patient: ${patientName || "Unknown"}
Visit Type: ${visitType || "General"}

--- TRANSCRIPT ---
${pseudonymizedTranscript}
--- END TRANSCRIPT ---

Respond with JSON only.`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let analysis: Record<string, unknown>;
    try {
      const cleanJson = aiResult.text
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      // De-pseudonymize the entire analysis JSON string, then parse
      analysis = JSON.parse(dePseudonymize(cleanJson, piiMappings));
    } catch {
      console.error("[AnalyzeConsultation] Failed to parse:", aiResult.text.slice(0, 500));
      return NextResponse.json({ error: "Failed to parse AI analysis" }, { status: 500 });
    }

    await logAuditEvent(
      supabase,
      user.id,
      "ai_analyze_consultation",
      "ai_session",
      crypto.randomUUID(),
      {
        provider: aiResult.provider,
        model: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      }
    );

    return NextResponse.json({
      ...analysis,
      analyzedAt: new Date().toISOString(),
      provider: aiResult.provider,
      model: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
      rateLimit: {
        remaining: limitResult.remaining,
        retryAfterSec: limitResult.retryAfterSec,
      },
    });
  } catch (err) {
    console.error("[AnalyzeConsultation] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
