import { createClient } from "@/lib/supabase/server";
import { generateWithFallback } from "@/lib/ai/provider";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { pseudonymize, dePseudonymize } from "@/lib/pseudonymize";
import { getCountryGuidelinesPromptBlock } from "@/lib/guidelines-by-country";
import { NextRequest, NextResponse } from "next/server";

const PSYCHIATRY_SYSTEM_BLOCK = `
SPECIALTY FOCUS — Psychiatry:
- Prioritize DSM-5 and ICD-10 criteria when discussing diagnoses (e.g. GAD, MDD, panic, PTSD, bipolar, ADHD). Mention required duration and symptom counts.
- When discussing treatment: reference evidence-based protocols (e.g. NICE, Maudsley Prescribing Guidelines where relevant) and first-line vs second-line options.
- Include screening scales when relevant (PHQ-9, GAD-7, MADRS, YMRS) and typical follow-up intervals (e.g. SSRI review at 2 weeks, lithium levels).
- For medication: mention dose equivalences when switching, key drug interactions, and adjustments for renal/hepatic function, pregnancy, and age when appropriate.
- Keep responses actionable for psychiatric practice; if the query is general medical, still frame with psychiatric context when useful.
`;

const MAX_QUERY_CHARS = 4000;
const MAX_CONTEXT_CHARS = 12000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = enforceAIRateLimit(user.id, "ask");
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

    const { query, context } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length > MAX_QUERY_CHARS) {
      return NextResponse.json(
        { error: `Query too long (max ${MAX_QUERY_CHARS} chars)` },
        { status: 400 }
      );
    }

    if (context && typeof context !== "string") {
      return NextResponse.json(
        { error: "Context must be a string when provided" },
        { status: 400 }
      );
    }

    if (context && context.length > MAX_CONTEXT_CHARS) {
      return NextResponse.json(
        { error: `Context too long (max ${MAX_CONTEXT_CHARS} chars)` },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("practice_country")
      .eq("id", user.id)
      .single();
    const countryBlock = getCountryGuidelinesPromptBlock(profile?.practice_country ?? undefined);

    // Pseudonymize query and context before sending to external AI
    const { pseudonymizedText: pseudonymizedQuery, mappings: queryMappings } = pseudonymize(query);
    const { pseudonymizedText: pseudonymizedContext, mappings: contextMappings } = context
      ? pseudonymize(context)
      : { pseudonymizedText: undefined, mappings: {} };
    const allMappings = { ...contextMappings, ...queryMappings };

    const systemPrompt = `You are an AI Clinical Assistant for physicians, with a focus on psychiatric practice. You provide evidence-based medical information, help with differential diagnoses, medication information, clinical guidelines, and coding assistance.

IMPORTANT GUIDELINES:
- Always provide evidence-based responses with references to current medical guidelines where appropriate
- Include ICD-10 codes when discussing diagnoses
- Mention drug interactions and contraindications when discussing medications
- Be thorough but concise
- If patient context is provided, tailor your response to that patient's history
- Format responses clearly with sections, bullet points, and key information highlighted
- Always include a disclaimer that AI suggestions should be verified by the clinician
- If you don't know something, say so rather than speculating
${PSYCHIATRY_SYSTEM_BLOCK}
${countryBlock ? `\nPRACTICE CONTEXT (country-specific):\n${countryBlock}` : ""}
${pseudonymizedContext ? `\nCONTEXT:\n${pseudonymizedContext}` : ""}`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt: pseudonymizedQuery,
      maxTokens: 2048,
      temperature: 0.1,
      preferredProvider: "auto",
    });

    await logAuditEvent(
      supabase,
      user.id,
      "ai_ask",
      "ai_session",
      crypto.randomUUID(),
      {
        provider: aiResult.provider,
        model: aiResult.model,
        fallbackUsed: aiResult.fallbackUsed,
      }
    );

    return NextResponse.json({
      response: dePseudonymize(aiResult.text, allMappings),
      provider: aiResult.provider,
      model: aiResult.model,
      fallbackUsed: aiResult.fallbackUsed,
      rateLimit: {
        remaining: limitResult.remaining,
        retryAfterSec: limitResult.retryAfterSec,
      },
    });
  } catch (err) {
    console.error("AI Ask error:", err);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
