import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "analyze");
    if (!limitResult.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfterSec: limitResult.retryAfterSec }, { status: 429 });
    }

    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const { pseudonymizedText, mappings } = pseudonymize(transcript);

    const systemPrompt = `You are a clinical documentation AI specializing in multi-problem visit structuring.

Analyze this consultation transcript and:
1. Identify ALL distinct clinical problems/chief complaints discussed
2. For EACH problem, create a separate structured assessment

Return JSON:
{
  "problems": [
    {
      "id": 1,
      "chief_complaint": "Brief description",
      "icd10_codes": [{"code": "...", "description": "..."}],
      "subjective": "Patient-reported symptoms for this problem",
      "objective": "Examination findings for this problem",
      "assessment": "Clinical assessment for this problem",
      "plan": "Treatment plan for this problem",
      "medications": [{"name": "...", "dosage": "...", "frequency": "...", "duration": "..."}],
      "follow_up": "Follow-up plan for this problem"
    }
  ],
  "shared_elements": {
    "vital_signs": "Vital signs if mentioned",
    "allergies": ["..."],
    "general_notes": "Any notes that apply across all problems"
  }
}`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt: pseudonymizedText,
      maxTokens: 4000,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    let parsed;
    try {
      const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { problems: [], shared_elements: {} };
      
      // De-pseudonymize all text fields
      if (parsed.problems) {
        parsed.problems = parsed.problems.map((p: Record<string, unknown>) => ({
          ...p,
          chief_complaint: dePseudonymize(String(p.chief_complaint || ""), mappings),
          subjective: dePseudonymize(String(p.subjective || ""), mappings),
          objective: dePseudonymize(String(p.objective || ""), mappings),
          assessment: dePseudonymize(String(p.assessment || ""), mappings),
          plan: dePseudonymize(String(p.plan || ""), mappings),
          follow_up: dePseudonymize(String(p.follow_up || ""), mappings),
        }));
      }
    } catch {
      parsed = { problems: [], shared_elements: {}, raw: dePseudonymize(aiResult.text, mappings) };
    }

    await logAuditEvent(supabase, user.id, "ai_multi_problem_analysis", "consultation", crypto.randomUUID(), {
      provider: aiResult.provider,
      problems_found: parsed.problems?.length || 0,
    });

    return NextResponse.json({
      ...parsed,
      provider: aiResult.provider,
      model: aiResult.model,
    });
  } catch (err) {
    console.error("Multi-problem analysis error:", err);
    return NextResponse.json({ error: "Failed to analyze multi-problem visit" }, { status: 500 });
  }
}
