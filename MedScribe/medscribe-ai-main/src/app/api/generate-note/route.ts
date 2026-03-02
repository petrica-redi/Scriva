import { createClient } from "@/lib/supabase/server";
import { generateNoteSchema } from "@/lib/validators";
import type { NoteSection, BillingCode } from "@/types";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import type { PatientInfo } from "@/lib/pseudonymize";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_PROMPTS: Record<string, { sections: string[]; instruction: string }> = {
  "SOAP Note": {
    sections: ["Subjective", "Objective", "Assessment", "Plan"],
    instruction: `Generate a SOAP note with these sections:
- **Subjective**: Patient's chief complaint, history of present illness, symptoms described in their own words, relevant medical/social/family history mentioned.
- **Objective**: Any vital signs, physical examination findings, lab results, or clinical observations mentioned by the doctor.
- **Assessment**: Clinical assessment, differential diagnoses, working diagnosis based on findings.
- **Plan**: Treatment plan, medications prescribed, follow-up instructions, referrals, patient education provided.`,
  },
  "Referral Letter": {
    sections: ["Referral To", "Reason for Referral", "Clinical Summary", "Current Medications", "Request"],
    instruction: `Generate a referral letter with these sections:
- **Referral To**: The specialist or department being referred to (infer from context, or use [?] if unclear).
- **Reason for Referral**: Why the patient is being referred.
- **Clinical Summary**: Brief summary of relevant history, examination findings, and current management.
- **Current Medications**: List any medications mentioned.
- **Request**: What is being requested from the specialist (evaluation, opinion, procedure, etc.).`,
  },
  "Discharge Summary": {
    sections: ["Admission Details", "Hospital Course", "Discharge Diagnosis", "Discharge Medications", "Follow-Up Instructions"],
    instruction: `Generate a discharge summary with these sections:
- **Admission Details**: Reason for admission, date, presenting complaints.
- **Hospital Course**: Summary of treatment, procedures, and progress during stay.
- **Discharge Diagnosis**: Final diagnosis or diagnoses.
- **Discharge Medications**: Medications on discharge with dosages if mentioned.
- **Follow-Up Instructions**: Follow-up appointments, activity restrictions, warning signs to watch for.`,
  },
  "Progress Note": {
    sections: ["Interval History", "Current Status", "Assessment", "Plan"],
    instruction: `Generate a progress note with these sections:
- **Interval History**: Changes since last visit, response to treatment, new symptoms.
- **Current Status**: Current condition, examination findings, test results.
- **Assessment**: Current clinical assessment and any changes in diagnosis.
- **Plan**: Adjustments to treatment, new orders, next steps.`,
  },
  "Patient Handout": {
    sections: ["Diagnosis Summary", "What This Means", "Your Treatment Plan", "Important Instructions", "When to Seek Help"],
    instruction: `Generate a patient-friendly handout in simple, clear language (no medical jargon). Sections:
- **Diagnosis Summary**: Simple explanation of what was found.
- **What This Means**: What the condition means in everyday terms.
- **Your Treatment Plan**: Medications, lifestyle changes, exercises explained simply.
- **Important Instructions**: Key dos and don'ts.
- **When to Seek Help**: Warning signs that require immediate medical attention.`,
  },
  "Specialist Consultation": {
    sections: ["Reason for Consultation", "History of Present Illness", "Examination Findings", "Investigations", "Opinion & Recommendations"],
    instruction: `Generate a specialist consultation note with these sections:
- **Reason for Consultation**: Why the consultation was requested.
- **History of Present Illness**: Detailed relevant history.
- **Examination Findings**: Pertinent positive and negative findings.
- **Investigations**: Tests ordered or reviewed with results.
- **Opinion & Recommendations**: Specialist's assessment and recommended management plan.`,
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ro: "Romanian", de: "German", fr: "French", es: "Spanish",
  it: "Italian", pt: "Portuguese", nl: "Dutch", pl: "Polish", hu: "Hungarian",
  bg: "Bulgarian", cs: "Czech", ru: "Russian", tr: "Turkish", hi: "Hindi",
  ja: "Japanese", ko: "Korean",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const limitResult = enforceAIRateLimit(user.id, "generate_note");
    if (!limitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryAfterSec: limitResult.retryAfterSec,
          remaining: limitResult.remaining,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validationResult = generateNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { consultation_id, template, transcript, language, metadata } = validationResult.data;

    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", consultation_id)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (consultation.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const templateConfig = TEMPLATE_PROMPTS[template] || TEMPLATE_PROMPTS["SOAP Note"];

    const patientName = metadata?.patient_name || "[Patient]";
    const visitType = metadata?.visit_type || "General";

    // Pseudonymize transcript before sending to external AI
    const patientInfo: PatientInfo = {
      name: metadata?.patient_name || undefined,
    };
    const { pseudonymizedText: pseudonymizedTranscript, mappings: piiMappings } =
      pseudonymize(transcript, patientInfo);

    const isEnglish = !language || language === "en" || language.startsWith("en-");
    const outputLanguage = LANGUAGE_NAMES[language || "en"] || language || "English";

    const languageRule = isEnglish
      ? ""
      : `
CRITICAL LANGUAGE RULE:
- The consultation was conducted in ${outputLanguage}. You MUST write ALL section content in ${outputLanguage}.
- Section titles MUST also be in ${outputLanguage}.
- Use medical terminology appropriate for ${outputLanguage}-speaking medical practice.
- Billing code descriptions and rationales should also be in ${outputLanguage}.
- The JSON structure keys remain in English — only the VALUES should be in ${outputLanguage}.`;

    const systemPrompt = `You are a medical documentation AI assistant. Your role is to generate accurate, professional clinical notes from doctor-patient consultation transcripts.

Rules:
- Extract information ONLY from the transcript provided. Do not invent or assume clinical details.
- Use professional medical terminology appropriate for the note type.
- If information for a section is not available in the transcript, write "No information available from this consultation." Do NOT make up details.
- Use [?] to mark any information that is unclear or ambiguous in the transcript.
- Be concise but thorough.
- Format each section as clean prose.
${languageRule}

You must respond with valid JSON only, no markdown formatting or code blocks. The JSON must match this exact structure:
{
  "sections": [
    { "title": "Section Title", "content": "Section content...", "order": 0 }
  ],
  "billing_codes": [
    {
      "code": "ICD-10 or CPT code",
      "system": "ICD-10" or "CPT",
      "description": "Description of the code",
      "confidence": 0.0 to 1.0,
      "rationale": "Why this code applies",
      "accepted": false
    }
  ]
}`;

    const userPrompt = `Generate a **${template}** for the following consultation.${!isEnglish ? ` The note MUST be written entirely in ${outputLanguage}.` : ""}

Patient: ${patientName}
Visit Type: ${visitType}

${templateConfig.instruction}

After generating the note sections, also suggest relevant billing codes:
- Include ICD-10 diagnosis codes that match the conditions discussed
- Include CPT procedure codes for the services provided
- Set confidence based on how clearly the transcript supports each code
${!isEnglish ? `\nREMINDER: Write ALL content (section titles, section content, billing code descriptions, and rationales) in ${outputLanguage}. Only the JSON keys stay in English.` : ""}

**Consultation Transcript:**
${pseudonymizedTranscript}

Respond with JSON only.`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let parsedResponse: { sections: NoteSection[]; billing_codes: BillingCode[] };
    try {
      const cleanJson = aiResult.text
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedResponse = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }

    // De-pseudonymize: restore real PII in the AI-generated content
    const sections: NoteSection[] = (parsedResponse.sections || []).map((section, idx) => ({
      title: dePseudonymize(String(section.title || `Section ${idx + 1}`), piiMappings),
      content: dePseudonymize(String(section.content || ""), piiMappings),
      order: typeof section.order === "number" ? section.order : idx,
    }));

    const billingCodes: BillingCode[] = (parsedResponse.billing_codes || []).map((code) => ({
      code: String(code.code || ""),
      system: code.system === "CPT" ? "CPT" : "ICD-10",
      description: dePseudonymize(String(code.description || ""), piiMappings),
      confidence: typeof code.confidence === "number" ? code.confidence : 0.5,
      rationale: code.rationale ? dePseudonymize(String(code.rationale), piiMappings) : undefined,
      accepted: false,
    }));

    const { data: profile } = await supabase
      .from("users")
      .select("settings")
      .eq("id", user.id)
      .single();

    const settings = (profile?.settings || {}) as Record<string, unknown>;
    const storeTranscriptText = settings.store_transcript_text !== false;

    const { data: clinicalNote, error: noteError } = await supabase
      .from("clinical_notes")
      .insert({
        consultation_id,
        template_id: null,
        sections,
        billing_codes: billingCodes,
        status: "draft",
        ai_model: aiResult.model,
        generation_metadata: {
          template,
          specialty: metadata?.specialty || "general",
          patient_name: patientName,
          visit_type: visitType,
          provider: aiResult.provider,
          fallback_used: aiResult.fallbackUsed,
          pseudonymized: true,
        },
      })
      .select()
      .single();

    if (noteError) {
      console.error("[GenerateNote] Database error saving note:", noteError);
      return NextResponse.json(
        { error: "Failed to save clinical note", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    const { error: transcriptError } = await supabase.from("transcripts").insert({
      consultation_id,
      full_text: storeTranscriptText ? transcript : null,
      segments: [],
      language: language || "en",
      provider: "deepgram",
    });

    if (transcriptError) {
      console.error("[GenerateNote] Database error saving transcript:", transcriptError);
    }

    const { error: statusError } = await supabase
      .from("consultations")
      .update({ status: "note_generated" })
      .eq("id", consultation_id);

    if (statusError) {
      console.error("[GenerateNote] Database error updating status:", statusError);
    }

    await logAuditEvent(
      supabase,
      user.id,
      "ai_generate_note",
      "consultation",
      consultation_id,
      {
        provider: aiResult.provider,
        model: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
        template,
      }
    );

    return NextResponse.json(
      {
        ...clinicalNote,
        ai_provider: aiResult.provider,
        ai_model: aiResult.model,
        fallback_used: aiResult.fallbackUsed,
        rateLimit: {
          remaining: limitResult.remaining,
          retryAfterSec: limitResult.retryAfterSec,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[GenerateNote] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
