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

    const limitResult = enforceAIRateLimit(user.id, "generate_note");
    if (!limitResult.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfterSec: limitResult.retryAfterSec }, { status: 429 });
    }

    const { note_sections, style_preferences } = await request.json();

    if (!note_sections || !Array.isArray(note_sections)) {
      return NextResponse.json({ error: "note_sections array is required" }, { status: 400 });
    }

    // Get user's style preferences from profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("note_style_preferences, specialty")
      .eq("id", user.id)
      .single();

    const prefs = style_preferences || userProfile?.note_style_preferences || {};

    const sectionsText = note_sections.map((s: { title: string; content: string }) => 
      `## ${s.title}\n${s.content}`
    ).join("\n\n");

    const { pseudonymizedText, mappings } = pseudonymize(sectionsText);

    const systemPrompt = `You are a clinical note style adapter. Rewrite the provided clinical note sections to match the physician's preferred writing style while preserving all clinical accuracy and completeness.

STYLE PREFERENCES:
- Verbosity: ${prefs.verbosity || "moderate"}
- Format: ${prefs.format_preference || "mixed"} (bullet_points, prose, or mixed)
- Assessment style: ${prefs.assessment_style || "numbered_list"}
- Include social history: ${prefs.include_social_history !== false ? "yes" : "only if clinically relevant"}
- Include family history: ${prefs.include_family_history !== false ? "yes" : "only if clinically relevant"}
${prefs.custom_instructions ? `- Custom instructions: ${prefs.custom_instructions}` : ""}
${userProfile?.specialty ? `- Specialty context: ${userProfile.specialty}` : ""}

Rewrite the note preserving the same section structure. Return each section with its title and rewritten content in JSON format:
[{"title": "...", "content": "...", "order": 1}, ...]`;

    const aiResult = await generateWithFallback({
      systemPrompt,
      userPrompt: pseudonymizedText,
      maxTokens: 4000,
      temperature: 0.2,
      preferredProvider: "auto",
    });

    let personalizedSections;
    try {
      const jsonMatch = aiResult.text.match(/\[[\s\S]*\]/);
      personalizedSections = jsonMatch ? JSON.parse(jsonMatch[0]) : note_sections;
      personalizedSections = personalizedSections.map((s: { title: string; content: string; order: number }) => ({
        ...s,
        content: dePseudonymize(s.content, mappings),
      }));
    } catch {
      personalizedSections = note_sections;
    }

    await logAuditEvent(supabase, user.id, "ai_personalize_note", "clinical_note", crypto.randomUUID(), {
      provider: aiResult.provider,
      model: aiResult.model,
    });

    return NextResponse.json({
      sections: personalizedSections,
      provider: aiResult.provider,
      model: aiResult.model,
    });
  } catch (err) {
    console.error("Personalize note error:", err);
    return NextResponse.json({ error: "Failed to personalize note" }, { status: 500 });
  }
}
