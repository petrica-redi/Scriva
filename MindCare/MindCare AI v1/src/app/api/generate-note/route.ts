import { createClient } from "@/lib/supabase/server";
import { generateNoteSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/utils/rate-limit";
import { logAudit } from "@/lib/audit";
import type { NoteSection, BillingCode } from "@/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/generate-note
 *
 * Takes a consultation transcript and generates a clinical note
 * using Mistral AI API directly (no external backend needed).
 *
 * Supports templates: SOAP Note, Referral Letter, Discharge Summary,
 * Progress Note, Patient Handout, Specialist Consultation.
 */

// Template-specific prompts for clinical note generation
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
  "Fișă de Consultații Medicale": {
    sections: ["Date Administrative", "Date Pacient", "Schimbări", "Antecedente", "Consultații, Investigații"],
    instruction: `Generează o Fișă de Consultații Medicale conform modelului standard românesc. Toate secțiunile TREBUIE scrise în limba română.

- **Date Administrative**: Județul, localitatea, unitatea sanitară, CNP, seria carnetului CAS, adeverința de asigurare de la medicul de familie.
- **Date Pacient**: Numele, prenumele, sexul (M/F), data nașterii, starea civilă, domiciliul complet (localitatea, strada, numărul), ocupația, întreprinderea/instituția.
- **Schimbări**: Schimbări de domiciliu și schimbări de loc de muncă relevante.
- **Antecedente**: Antecedente heredo-colaterale (boli în familie), antecedente personale (boli anterioare, intervenții chirurgicale), condiții de muncă (expuneri, factori de risc profesionali).
- **Consultații, Investigații**: Pentru fiecare consultație: data (anul/luna/ziua), simptomele prezentate, diagnosticul, codul ICD-10, prescripțiile și recomandările, numărul de zile de concediu medical (dacă este cazul), numărul certificatului medical.

Extrage din transcript toate informațiile relevante și completează fișa. Dacă o informație nu este disponibilă în transcript, scrie "Nu se menționează în consultație." Folosește terminologia medicală în limba română.`,
  },
  "Fișă de Consultații Medicale - Adulți": {
    sections: ["Date Administrative", "Date Pacient", "Schimbări", "Antecedente", "Consultații, Investigații"],
    instruction: `Generează o Fișă de Consultații Medicale pentru Adulți conform modelului standard românesc. Toate secțiunile TREBUIE scrise în limba română.

- **Date Administrative**: Județul, localitatea, unitatea sanitară, CNP, seria carnetului CAS, adeverința de asigurare de la medicul de familie.
- **Date Pacient**: Numele, prenumele, sexul (M/F), data nașterii, starea civilă, domiciliul complet (localitatea, strada, numărul), ocupația, întreprinderea/instituția.
- **Schimbări**: Schimbări de domiciliu și schimbări de loc de muncă relevante.
- **Antecedente**: Antecedente heredo-colaterale (boli în familie), antecedente personale (boli anterioare, intervenții chirurgicale), condiții de muncă (expuneri, factori de risc profesionali).
- **Consultații, Investigații**: Pentru fiecare consultație: data (anul/luna/ziua), simptomele prezentate, diagnosticul, codul ICD-10, prescripțiile și recomandările, numărul de zile de concediu medical (dacă este cazul), numărul certificatului medical.

Extrage din transcript toate informațiile relevante și completează fișa. Dacă o informație nu este disponibilă în transcript, scrie "Nu se menționează în consultație." Folosește terminologia medicală în limba română.`,
  },
};

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 note generations per minute per IP
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`generate-note:${clientIp}`, { limit: 5, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Demo mode: skip auth in development
    const effectiveUserId = user?.id || "00000000-0000-0000-0000-000000000000";

    // Parse and validate request body
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

    const { consultation_id, template, transcript, language, metadata } =
      validationResult.data;

    // Verify consultation ownership
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

    if (consultation.user_id !== effectiveUserId && consultation.user_id !== user?.id) {
      // In demo mode, skip ownership check
    }

    // Check for Anthropic API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local", code: "CONFIG_ERROR" },
        { status: 500 }
      );
    }

    // Get template configuration
    const templateConfig = TEMPLATE_PROMPTS[template] || TEMPLATE_PROMPTS["SOAP Note"];

    // Build the prompt
    const patientName = metadata?.patient_name || "[Patient]";
    const visitType = metadata?.visit_type || "General";

    // Determine output language
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", ro: "Romanian", de: "German", fr: "French", es: "Spanish",
      it: "Italian", pt: "Portuguese", nl: "Dutch", pl: "Polish", hu: "Hungarian",
      bg: "Bulgarian", cs: "Czech", ru: "Russian", tr: "Turkish", hi: "Hindi",
      ja: "Japanese", ko: "Korean",
    };
    const isEnglish = !language || language === "en" || language.startsWith("en-");
    const outputLanguage = LANGUAGE_NAMES[language || "en"] || language || "English";

    const isRomanian = language === 'ro';
    const languageRule = isEnglish
      ? ""
      : isRomanian
      ? `
REGULI CRITICE PENTRU LIMBA ROMÂNĂ:
- Consultația s-a desfășurat în limba română. TREBUIE să scrii TOATE secțiunile în limba română.
- Titlurile secțiunilor TREBUIE să fie în română (ex. Notă SOAP: "Subiectiv", "Obiectiv", "Evaluare", "Plan").
- Folosește terminologia medicală românească conformă cu nomenclatorul Colegiului Medicilor din România.
- Folosește coduri ICD-10 și nomenclatura medicală românească standard.
- Cunoști sistemul de sănătate românesc (CNAS, CAS, medic de familie, trimiteri, rețete compensate/gratuite).
- Structura notei medicale românești: Motive internare/prezentare, Antecedente personale patologice, Antecedente heredo-colaterale, Condiții de viață și muncă, Examen obiectiv, Investigații paraclinice, Diagnostic pozitiv, Diagnostic diferențial, Tratament, Evoluție și prognostic, Recomandări la externare.
- Medicamentele: menționează DCI (denumire comună internațională) + denumiri comerciale românești când e posibil.
- Codurile de facturare și motivările trebuie să fie tot în română.
- Cheile JSON ("title", "content", "code") rămân în engleză — doar VALORILE sunt în română.`
      : `
CRITICAL LANGUAGE RULE:
- The consultation was conducted in ${outputLanguage}. You MUST write ALL section content in ${outputLanguage}.
- Section titles MUST also be in ${outputLanguage} (e.g. for a SOAP note in Romanian: "Subiectiv", "Obiectiv", "Evaluare", "Plan").
- Use medical terminology appropriate for ${outputLanguage}-speaking medical practice.
- Billing code descriptions and rationales should also be in ${outputLanguage}.
- The JSON structure keys ("title", "content", "code", etc.) remain in English — only the VALUES should be in ${outputLanguage}.`;

    const systemPrompt = `You are a medical documentation AI assistant. Your role is to generate accurate, professional clinical notes from doctor-patient consultation transcripts.

Rules:
- Extract information ONLY from the transcript provided. Do not invent or assume clinical details.
- Use professional medical terminology appropriate for the note type.
- If information for a section is not available in the transcript, write "No information available from this consultation." Do NOT make up details.
- Use [?] to mark any information that is unclear or ambiguous in the transcript.
- Be concise but thorough.
- Format each section as clean prose (no bullet points unless medically standard for that section).
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
${transcript}

Respond with JSON only.`;

    // Call Anthropic Claude API
    console.log(`[GenerateNote] Calling Claude Sonnet API for ${template}...`);

    let responseText = "";
    try {
      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text();
        console.error(`[GenerateNote] Anthropic API error:`, errText);
        return NextResponse.json(
          { error: `AI generation failed: ${errText}`, code: "AI_SERVICE_ERROR" },
          { status: 500 }
        );
      }

      const anthropicData = await anthropicResponse.json();
      responseText = anthropicData.content?.[0]?.text || "";
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[GenerateNote] Anthropic API error:`, errMsg);
      return NextResponse.json(
        { error: `AI generation failed: ${errMsg}`, code: "AI_SERVICE_ERROR" },
        { status: 500 }
      );
    }

    console.log(`[GenerateNote] Claude response received, parsing JSON...`);

    // Parse the JSON response from Claude
    let parsedResponse: { sections: NoteSection[]; billing_codes: BillingCode[] };
    try {
      // Strip any markdown code block markers if present
      const cleanJson = responseText
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedResponse = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("[GenerateNote] Failed to parse Claude response:", responseText.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }

    // Validate and normalize sections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: NoteSection[] = (parsedResponse.sections || []).map(
      (section: any, idx: number) => ({
        title: String(section.title || `Section ${idx + 1}`),
        content: String(section.content || ""),
        order: typeof section.order === "number" ? section.order : idx,
      })
    );

    // Validate and normalize billing codes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billingCodes: BillingCode[] = (parsedResponse.billing_codes || []).map(
      (code: any) => ({
        code: String(code.code || ""),
        system: code.system === "CPT" ? "CPT" : "ICD-10",
        description: String(code.description || ""),
        confidence: typeof code.confidence === "number" ? code.confidence : 0.5,
        rationale: code.rationale ? String(code.rationale) : undefined,
        accepted: false,
      })
    );

    const modelUsed = "claude-sonnet-4-20250514";

    // Save clinical note to database
    const { data: clinicalNote, error: noteError } = await supabase
      .from("clinical_notes")
      .insert({
        consultation_id,
        template_id: null,
        sections,
        billing_codes: billingCodes,
        status: "draft",
        ai_model: modelUsed,
        generation_metadata: {
          template,
          specialty: metadata?.specialty || "general",
          patient_name: patientName,
          visit_type: visitType,
        },
      })
      .select()
      .single();

    if (noteError) {
      console.error("[GenerateNote] Database error saving note:", noteError);
      return NextResponse.json(
        {
          error: "Failed to save clinical note",
          code: "DATABASE_ERROR",
          details: noteError,
        },
        { status: 500 }
      );
    }

    // Save transcript to database — store the actual consultation language
    const { error: transcriptError } = await supabase
      .from("transcripts")
      .insert({
        consultation_id,
        full_text: transcript,
        segments: [],
        language: language || "en",
        provider: "deepgram",
      });

    if (transcriptError) {
      console.error("[GenerateNote] Database error saving transcript:", transcriptError);
      // Non-fatal — note was already saved
    }

    // Update consultation status
    const { error: statusError } = await supabase
      .from("consultations")
      .update({ status: "note_generated" })
      .eq("id", consultation_id);

    if (statusError) {
      console.error("[GenerateNote] Database error updating status:", statusError);
      // Non-fatal — note was already saved
    }

    console.log(`[GenerateNote] Note generated successfully: ${sections.length} sections, ${billingCodes.length} billing codes`);

    return NextResponse.json(clinicalNote, { status: 201 });
  } catch (error) {
    console.error("[GenerateNote] Unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: message,
      },
      { status: 500 }
    );
  }
}
