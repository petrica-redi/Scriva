import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { loadCriteria, validateWithRules } from "@/lib/dsm5-criteria";
import type { CriterionEvaluation } from "@/lib/dsm5-criteria";
import { NextRequest, NextResponse } from "next/server";

const MAX_TRANSCRIPT_CHARS = 50000;

const EXTRACTION_PROMPT = `You are a psychiatric clinical assistant analyzing a consultation transcript.

CURRENT TRANSCRIPT:
{transcript}

SUSPECTED DIAGNOSIS BEING EVALUATED: {diagnosis_code} - {diagnosis_name}

CRITERIA TO EVALUATE (JSON):
{criteria_json}

For each criterion, analyze the transcript and return:
1. "met": true / false / null (null = not enough information yet)
2. "evidence": exact quote from transcript that supports your assessment, or null
3. "confidence": "high" | "medium" | "low"
4. "follow_up_needed": suggested question if criterion is unclear, or null

CRITICAL RULES:
- For TEMPORAL criteria: extract the EXACT duration mentioned. If patient says "a month" and criterion requires 6 months, set "met" to false and include "reported_duration_months": 1.
- For CHECKLIST criteria: return an "items" object with each item key (e.g. C1, C2) and { "met": true|false|null, "evidence": "quote" }. Only mark items as met if there is EXPLICIT evidence. Do not infer symptoms that were not mentioned.
- For EXCLUSION criteria: flag if organic causes have NOT been ruled out (met: null or false).

Return a single JSON object with keys matching the criterion IDs (A, B, C, D, E, F etc.). For criterion C (checklist), include an "items" object with C1, C2, ... and a top-level "met" for the overall criterion. Include "reported_duration_months" for temporal criteria. Add a "suggested_questions" array (5-8 strings) of follow-up questions to clarify missing or unclear criteria.

Return JSON only. No markdown, no code block, no text outside JSON.`;

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

    const { transcript, diagnosis_code: diagnosisCode } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }
    if (!diagnosisCode || typeof diagnosisCode !== "string") {
      return NextResponse.json({ error: "diagnosis_code is required" }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json(
        { error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS} chars)` },
        { status: 400 }
      );
    }

    const criteriaDef = loadCriteria(diagnosisCode);
    if (!criteriaDef) {
      return NextResponse.json(
        { error: `Unsupported diagnosis code: ${diagnosisCode}. Supported: F41.1 (and others as added).` },
        { status: 400 }
      );
    }

    const criteriaJson = JSON.stringify(criteriaDef.criteria, null, 2);
    const systemPrompt = EXTRACTION_PROMPT.replace("{transcript}", transcript.slice(-25000))
      .replace("{diagnosis_code}", criteriaDef.code)
      .replace("{diagnosis_name}", criteriaDef.name)
      .replace("{criteria_json}", criteriaJson);

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt: "Return the criteria evaluation JSON only.",
      maxTokens: 2048,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let raw: Record<string, unknown>;
    try {
      const text = aiResult.text
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      raw = JSON.parse(text);
    } catch {
      console.error("[EvaluateCriteria] Parse error:", aiResult.text.slice(0, 400));
      return NextResponse.json(
        { error: "Failed to parse AI criteria evaluation" },
        { status: 500 }
      );
    }

    const suggested_questions = Array.isArray(raw.suggested_questions)
      ? (raw.suggested_questions as string[]).filter((q) => typeof q === "string")
      : [];

    const criteria: Record<string, CriterionEvaluation> = {};
    for (const key of Object.keys(criteriaDef.criteria)) {
      const v = raw[key];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>;
        criteria[key] = {
          met: obj.met === true ? true : obj.met === false ? false : null,
          evidence: typeof obj.evidence === "string" ? obj.evidence : null,
          confidence:
            obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
              ? obj.confidence
              : undefined,
          follow_up_needed: typeof obj.follow_up_needed === "string" ? obj.follow_up_needed : null,
          reported_duration_months:
            typeof obj.reported_duration_months === "number" ? obj.reported_duration_months : null,
          items: undefined,
        };
        if (obj.items && typeof obj.items === "object" && !Array.isArray(obj.items)) {
          const items: Record<string, { met: boolean | null; evidence?: string | null }> = {};
          for (const [itemKey, itemVal] of Object.entries(obj.items as Record<string, unknown>)) {
            const item = itemVal as Record<string, unknown>;
            items[itemKey] = {
              met: item.met === true ? true : item.met === false ? false : null,
              evidence: typeof item.evidence === "string" ? item.evidence : null,
            };
          }
          criteria[key].items = items;
        }
      }
    }

    const alerts = validateWithRules(diagnosisCode, criteriaDef, criteria);

    await logAuditEvent(
      supabase,
      user.id,
      "ai_evaluate_criteria",
      "ai_session",
      crypto.randomUUID(),
      { provider: aiResult.provider, model: aiResult.model, diagnosis_code: diagnosisCode }
    );

    return NextResponse.json({
      diagnosis_code: criteriaDef.code,
      diagnosis_name: criteriaDef.name,
      criteria,
      suggested_questions,
      alerts,
      evaluatedAt: new Date().toISOString(),
      provider: aiResult.provider,
      model: aiResult.model,
      rateLimit: {
        remaining: limitResult.remaining,
        retryAfterSec: limitResult.retryAfterSec,
      },
    });
  } catch (err) {
    console.error("[EvaluateCriteria] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}
