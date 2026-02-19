import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

/**
 * POST /api/ai/analyze-consultation
 *
 * Analyzes a consultation transcript in real-time and returns:
 * - Potential diagnoses with confidence levels
 * - Suggested follow-up questions the doctor can ask
 * - Key clinical findings extracted from the conversation
 * - Red flags or urgent items
 *
 * Supports streaming for a responsive UI.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`ai-analyze:${clientIp}`, { limit: 10, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const supabase = await createClient();
    // Demo mode: no auth required

    const { transcript, visitType, patientName } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const mistralApiKey = process.env.MISTRAL_API_KEY;
    if (!mistralApiKey) {
      return NextResponse.json({ error: "Mistral API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are an expert clinical decision support AI assisting a doctor during a live consultation. Analyze the doctor-patient conversation transcript and provide actionable clinical intelligence.

You MUST respond with valid JSON only (no markdown, no code blocks). Use this exact structure:

{
  "diagnoses": [
    {
      "name": "Diagnosis name",
      "icd10": "ICD-10 code if known",
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief clinical reasoning (1-2 sentences)"
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
  "differentialNotes": "Brief narrative (2-3 sentences) about the differential diagnosis thought process"
}

Rules:
- Base ALL analysis strictly on information in the transcript. Never invent symptoms or findings.
- Order diagnoses by confidence (highest first). Include 3-6 potential diagnoses.
- Suggest 5-8 follow-up questions the doctor hasn't asked yet, prioritized by clinical importance.
- Red flags should only appear if there are genuinely concerning symptoms or presentations.
- If information is insufficient, say so in differentialNotes rather than guessing.
- Be specific and actionable — the doctor needs practical help, not generic advice.

MEDICATION & DRUG INTERACTION RULES:
- Extract ALL medications mentioned in the transcript: current medications the patient is taking, newly prescribed medications, and any medications mentioned in passing (OTC, supplements, herbal remedies).
- For drug interactions, analyze EVERY pair of medications for known clinically significant interactions.
- Include interactions between current medications AND between current medications and any newly prescribed ones.
- Also flag interactions with common foods/substances if mentioned (e.g. grapefruit, alcohol, St. John's Wort).
- Severity levels: "major" = potentially life-threatening or causing permanent damage, "moderate" = may require intervention or monitoring, "minor" = minimal clinical significance but worth noting.
- If NO medications are mentioned, return empty arrays for medications and drugInteractions.
- Be thorough: even if only 2 medications are mentioned, check for interactions. Drug safety is critical.`;

    const userPrompt = `Analyze this live consultation transcript and provide clinical decision support.

Patient: ${patientName || "Unknown"}
Visit Type: ${visitType || "General"}

--- TRANSCRIPT ---
${transcript}
--- END TRANSCRIPT ---

Respond with JSON only.`;

    const { Mistral } = await import("@mistralai/mistralai");
    const mistralClient = new Mistral({ apiKey: mistralApiKey });

    let mistralData;
    try {
      mistralData = await mistralClient.chat.complete({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 2048,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[AnalyzeConsultation] Mistral error:", errMsg);
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    const responseText = typeof mistralData.choices?.[0]?.message?.content === 'string'
      ? mistralData.choices[0].message.content
      : "";

    let analysis;
    try {
      const cleanJson = responseText.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      analysis = JSON.parse(cleanJson);
    } catch {
      console.error("[AnalyzeConsultation] Failed to parse:", responseText.substring(0, 500));
      return NextResponse.json({ error: "Failed to parse AI analysis" }, { status: 500 });
    }

    return NextResponse.json({
      ...analysis,
      analyzedAt: new Date().toISOString(),
      model: mistralData.model || "mistral-large-latest",
    });
  } catch (err) {
    console.error("[AnalyzeConsultation] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
